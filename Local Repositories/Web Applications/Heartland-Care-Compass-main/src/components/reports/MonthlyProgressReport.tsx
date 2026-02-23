import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormattedText } from "@/components/ui/formatted-text";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Save, FileDown, RotateCcw, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import { fetchProgressNotes } from "@/utils/local-storage-utils";
import { findProfessional } from "@/utils/professionalUtils";
import { getProgressNotesByYouth } from "@/lib/api";
import * as aiService from "@/services/aiService";

// API fetch function with fallback to localStorage
const fetchProgressNotesAPI = async (youthId: string) => {
  try {
    return await getProgressNotesByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for progress-notes; falling back to localStorage:', e);
    return fetchProgressNotes(youthId);
  }
};

interface MonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyReportData {
  // Youth Profile Information
  fullLegalName: string;
  preferredName: string;
  dateOfBirth: string;
  age: string;
  dateOfAdmission: string;
  lengthOfStay: string;
  currentPlacement: string;
  probationOfficer: string;
  guardiansInfo: string;
  schoolPlacement: string;
  currentGrade: string;
  currentDiagnoses: string;

  // Assistance
  assistanceSummary: string;

  // Incredible Opportunity
  incredibleOpportunitySummary: string;

  // Academic
  academicSummary: string;

  // Behavioral
  behavioralSummary: string;

  // Social Development
  socialSummary: string;

  // Treatment Progress
  treatmentProgressSummary: string;

  // Future Goals (newline-separated list)
  futureGoals: string;

  // Report metadata
  preparedBy: string;
  reportDate: string;
  month: string;
  year: string;
}

export const MonthlyProgressReport = ({ youth }: MonthlyProgressReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [activeTab, setActiveTab] = useState<string>("youth-info");
  const [reportData, setReportData] = useState<MonthlyReportData>({
    fullLegalName: "",
    preferredName: "",
    dateOfBirth: "",
    age: "",
    dateOfAdmission: "",
    lengthOfStay: "",
    currentPlacement: "",
    probationOfficer: "",
    guardiansInfo: "",
    schoolPlacement: "",
    currentGrade: "",
    currentDiagnoses: "",
    assistanceSummary: "",
    incredibleOpportunitySummary: "",
    academicSummary: "",
    behavioralSummary: "",
    socialSummary: "",
    treatmentProgressSummary: "",
    futureGoals: "",
    preparedBy: "",
    reportDate: format(new Date(), "yyyy-MM-dd"),
    month: format(new Date(), "MMMM"),
    year: format(new Date(), "yyyy")
  });

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // AI enhancement state
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  // Helper function to check if a section is complete
  const isSectionComplete = (section: string): boolean => {
    switch (section) {
      case "youth-info":
        return !!(reportData.fullLegalName && reportData.dateOfBirth);
      case "assistance":
        return (reportData.assistanceSummary?.length ?? 0) > 50;
      case "incredible-opportunity":
        return (reportData.incredibleOpportunitySummary?.length ?? 0) > 50;
      case "social":
        return (reportData.socialSummary?.length ?? 0) > 50;
      case "academic":
        return (reportData.academicSummary?.length ?? 0) > 20;
      case "behavioral":
        return (reportData.behavioralSummary?.length ?? 0) > 50;
      case "treatment":
        return (reportData.treatmentProgressSummary?.length ?? 0) > 50;
      case "future-goals":
        return (reportData.futureGoals?.length ?? 0) > 20;
      default:
        return false;
    }
  };

  // Auto-populate form with youth data
  const autoPopulateForm = async () => {
    if (!youth?.id) {
      console.log('No youth ID provided');
      return;
    }

    console.log('Auto-populating form for youth:', youth.firstName, youth.lastName, 'ID:', youth.id);

    try {
      // Fetch ALL case notes for this youth
      const progressNotes = await fetchProgressNotesAPI(youth.id).catch(() => fetchProgressNotes(youth.id));

      console.log('Fetched case notes:', progressNotes.length);

      // Use all notes (most recent first) for richer auto-population
      const monthProgressNotes = [...progressNotes].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      // Calculate length of stay
      let lengthOfStay = "";
      if (youth.admissionDate) {
        const admissionDate = new Date(youth.admissionDate);
        admissionDate.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (admissionDate > now) {
          lengthOfStay = "Not yet admitted";
        } else {
          let years = now.getFullYear() - admissionDate.getFullYear();
          let months = now.getMonth() - admissionDate.getMonth();
          let days = now.getDate() - admissionDate.getDate();
          if (days < 0) {
            months -= 1;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
          }
          if (months < 0) {
            years -= 1;
            months += 12;
          }
          const parts = [];
          if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
          if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
          if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
          lengthOfStay = parts.join(', ');
        }
      }

      // Calculate age
      let age = "";
      if (youth.dob) {
        const dob = new Date(youth.dob as any);
        const today = new Date();
        age = Math.floor(differenceInDays(today, dob) / 365.25).toString();
      }

      // Map youth data to form fields
      const autoPopulatedData = {
        fullLegalName: `${youth.firstName} ${youth.lastName}`,
        preferredName: youth.firstName,
        dateOfBirth: youth.dob ? format(new Date(youth.dob as any), "yyyy-MM-dd") : "",
        age,
        dateOfAdmission: youth.admissionDate ? format(new Date(youth.admissionDate as any), "yyyy-MM-dd") : "",
        lengthOfStay,
        currentPlacement: "Heartland Boys Home",
        probationOfficer: findProfessional(youth, 'probationOfficer')?.name || "",
        guardiansInfo: formatGuardiansInfo(youth),
        schoolPlacement: youth.currentSchool || youth.lastSchoolAttended || "",
        currentGrade: youth.currentGrade || "",
        currentDiagnoses: youth.currentDiagnoses || youth.diagnoses || "",

        // Case-note-based summaries
        assistanceSummary: generateAssistanceSummary(monthProgressNotes),
        incredibleOpportunitySummary: generateIncredibleOpportunitySummary(monthProgressNotes),
        academicSummary: generateAcademicSummary(youth, monthProgressNotes),
        behavioralSummary: generateBehavioralSummary(monthProgressNotes),
        socialSummary: generateSocialSummary(monthProgressNotes),
        treatmentProgressSummary: generateTreatmentProgressSummary(youth, monthProgressNotes),
        futureGoals: generateFutureGoals(youth, monthProgressNotes),
      };

      // Update fields intelligently
      setReportData(prev => {
        const updates: Partial<typeof reportData> = {};

        const alwaysUpdateFields = [
          'fullLegalName', 'preferredName', 'dateOfBirth', 'age',
          'dateOfAdmission', 'lengthOfStay', 'currentPlacement',
          'probationOfficer', 'guardiansInfo', 'schoolPlacement', 'currentGrade', 'currentDiagnoses'
        ];

        Object.entries(autoPopulatedData).forEach(([key, value]) => {
          if (alwaysUpdateFields.includes(key)) {
            if (value) {
              updates[key as keyof typeof reportData] = value as any;
            }
          } else {
            if (!prev[key as keyof typeof reportData] && value) {
              updates[key as keyof typeof reportData] = value as any;
            }
          }
        });

        return { ...prev, ...updates };
      });

    } catch (error) {
      console.error("Error auto-populating form:", error);
    }
  };

  // Helper functions for generating content
  const formatGuardiansInfo = (youth: Youth): string => {
    const guardians = [];
    if (youth.legalGuardian) {
      if (typeof youth.legalGuardian === 'object') {
        guardians.push(`${youth.legalGuardian.name || 'Legal Guardian'} (Relationship: ${youth.guardianRelationship || 'Unknown'})`);
      } else {
        guardians.push(`${youth.legalGuardian} (Legal Guardian)`);
      }
    }
    if (youth.mother?.name) guardians.push(`${youth.mother.name} (Mother)`);
    if (youth.father?.name) guardians.push(`${youth.father.name} (Father)`);
    if (youth.nextOfKin?.name) guardians.push(`${youth.nextOfKin.name} (Next of Kin: ${youth.nextOfKin.relationship || 'Unknown'})`);

    return guardians.length > 0 ? guardians.join('; ') : "No guardian information available";
  };

  // Generate Assistance summary from case notes
  const generateAssistanceSummary = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "";
    const assistanceNotes = progressNotes.filter(note => {
      const content = extractCaseNoteContent(note).toLowerCase();
      return content.includes('assist') || content.includes('help') || content.includes('support') ||
        content.includes('resource') || content.includes('service') || content.includes('referral') ||
        content.includes('advocacy') || content.includes('coordination') || content.includes('transport') ||
        content.includes('appointment');
    });
    const highlights = collectCaseNoteHighlights(assistanceNotes.length > 0 ? assistanceNotes : progressNotes, 5);
    if (highlights.length > 0) {
      return `During this reporting period, the following assistance was documented: ${highlights.join(' ')}`;
    }
    return `${progressNotes.length} reports were documented during this period. Review reports for details on assistance provided.`;
  };

  // Generate Incredible Opportunity summary from case notes
  const generateIncredibleOpportunitySummary = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "";
    const opportunityNotes = progressNotes.filter(note => {
      const content = extractCaseNoteContent(note).toLowerCase();
      return content.includes('opportunity') || content.includes('volunteer') || content.includes('community') ||
        content.includes('field trip') || content.includes('event') || content.includes('activity') ||
        content.includes('outing') || content.includes('experience') || content.includes('excursion') ||
        content.includes('recreation') || content.includes('incredible');
    });
    const highlights = collectCaseNoteHighlights(opportunityNotes.length > 0 ? opportunityNotes : [], 5);
    if (highlights.length > 0) {
      return `${youth.firstName} participated in the following opportunities: ${highlights.join(' ')}`;
    }
    return "";
  };

  // Generate Social summary from case notes
  const generateSocialSummary = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "";
    const socialNotes = progressNotes.filter(note => {
      const content = extractCaseNoteContent(note).toLowerCase();
      return content.includes('peer') || content.includes('social') || content.includes('friend') ||
        content.includes('relationship') || content.includes('interaction') || content.includes('conflict') ||
        content.includes('group') || content.includes('staff') || content.includes('communicate') ||
        content.includes('cooperat');
    });
    const highlights = collectCaseNoteHighlights(socialNotes.length > 0 ? socialNotes : progressNotes, 5);
    if (highlights.length > 0) {
      return `${youth.firstName}'s social interactions during this period include: ${highlights.join(' ')}`;
    }
    return `${progressNotes.length} reports documented during this period. Review reports for details on social development.`;
  };

  // Generate Academic summary - always starts with school placement, adds case note details
  const generateAcademicSummary = (youth: Youth, progressNotes: any[]): string => {
    const grade = youth.currentGrade ? ` ${youth.firstName} is currently enrolled in grade ${youth.currentGrade}.` : "";
    let summary = `${youth.firstName} is currently placed at the Heartland Boys Home Independent School, which is managed by Berniklau Education Solutions.${grade}`;

    const academicNotes = progressNotes.filter(note => {
      const content = extractCaseNoteContent(note).toLowerCase();
      return content.includes('school') || content.includes('academic') || content.includes('class') ||
        content.includes('grade') || content.includes('homework') || content.includes('education') ||
        content.includes('teacher') || content.includes('assignment') || content.includes('test') ||
        content.includes('study') || content.includes('credit') || content.includes('learning');
    });

    const highlights = collectCaseNoteHighlights(academicNotes, 3);
    if (highlights.length > 0) {
      summary += ` Academic documentation from this period includes: ${highlights.join(' ')}`;
    }

    return summary;
  };

  // Generate Behavioral summary from case notes
  const generateBehavioralSummary = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "";

    const behavioralNotes = progressNotes.filter(note => {
      const content = extractCaseNoteContent(note).toLowerCase();
      return content.includes('behavior') || content.includes('incident') || content.includes('aggress') ||
        content.includes('compli') || content.includes('rule') || content.includes('consequence') ||
        content.includes('redirect') || content.includes('de-escal') || content.includes('challenging') ||
        content.includes('inappropriate') || content.includes('crisis') || content.includes('conduct') ||
        content.includes('progress') || content.includes('positive') || content.includes('discipline') ||
        content.includes('cooperation') || content.includes('respectful');
    });

    const highlights = collectCaseNoteHighlights(behavioralNotes.length > 0 ? behavioralNotes : progressNotes, 5);
    if (highlights.length > 0) {
      return `${youth.firstName}'s behavioral documentation during this reporting period includes: ${highlights.join(' ')}`;
    }
    return `${progressNotes.length} reports were documented during this period. Review reports for details on behavioral progress.`;
  };

  const generateFutureGoals = (_youth: Youth, _progressNotes: any[]): string => {
    return "";
  };

  const parseCaseNoteJson = (note: any): any | null => {
    if (!note?.note || typeof note.note !== 'string') {
      return null;
    }
    try {
      return JSON.parse(note.note);
    } catch {
      return null;
    }
  };

  const isSchoolCaseNote = (note: any): boolean => {
    const parsed = parseCaseNoteJson(note);
    return parsed?.noteType === 'school';
  };

  const extractCaseNoteContent = (note: any): string => {
    if (!note) return "";
    if (typeof note.summary === 'string' && note.summary.trim().length > 0) {
      return note.summary.trim();
    }
    const rawNote = typeof note.note === 'string' ? note.note : "";
    if (!rawNote) return "";
    const parsed = parseCaseNoteJson(note);
    if (parsed?.noteType === 'school' && parsed.sections) {
      const { overview, behavior, academics, interventions, followUp } = parsed.sections;
      const parts: string[] = [];
      if (typeof overview === 'string' && overview.trim()) {
        parts.push(overview.trim());
      }
      if (typeof behavior === 'string' && behavior.trim()) {
        parts.push(`Behavior: ${behavior.trim()}`);
      }
      if (typeof academics === 'string' && academics.trim()) {
        parts.push(`Academics: ${academics.trim()}`);
      }
      if (typeof interventions === 'string' && interventions.trim()) {
        parts.push(`Supports: ${interventions.trim()}`);
      }
      if (typeof followUp === 'string' && followUp.trim()) {
        parts.push(`Follow-up: ${followUp.trim()}`);
      }
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    if (parsed?.sections) {
      return Object.values(parsed.sections)
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .join(' ');
    }
    if (parsed?.content && typeof parsed.content === 'string') {
      return parsed.content;
    }
    return rawNote;
  };

  const formatCaseNoteHighlight = (note: any): string => {
    const parsed = parseCaseNoteJson(note);
    const content = extractCaseNoteContent(note);
    if (!content) return "";

    let noteDate = "";
    if (note?.date) {
      const parsedDate = new Date(note.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        noteDate = format(parsedDate, "MMM d");
      }
    }

    const staff = note?.staff ? ` (${note.staff})` : "";
    let snippet = content;

    if (parsed?.noteType === 'school' && parsed?.sections) {
      const { overview, behavior, academics, interventions, followUp } = parsed.sections;
      const labeled: string[] = [];
      if (typeof overview === 'string' && overview.trim()) {
        labeled.push(overview.trim());
      }
      if (typeof behavior === 'string' && behavior.trim()) {
        labeled.push(`Behavior: ${behavior.trim()}`);
      }
      if (typeof academics === 'string' && academics.trim()) {
        labeled.push(`Academics: ${academics.trim()}`);
      }
      if (typeof interventions === 'string' && interventions.trim()) {
        labeled.push(`Supports: ${interventions.trim()}`);
      }
      if (typeof followUp === 'string' && followUp.trim()) {
        labeled.push(`Follow-up: ${followUp.trim()}`);
      }
      if (labeled.length > 0) {
        snippet = labeled.join(' | ');
      }
    }

    if (snippet.length > 180) {
      snippet = `${snippet.slice(0, 177)}...`;
    }
    return `${noteDate ? `${noteDate}: ` : ""}${snippet}${staff}`;
  };

  const collectCaseNoteHighlights = (notes: any[], limit = 3): string[] => {
    if (!notes || notes.length === 0) return [];
    const sorted = [...notes].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
    return sorted
      .slice(-limit)
      .map(formatCaseNoteHighlight)
      .filter(Boolean);
  };

  // Treatment progress summary based on case notes
  const generateTreatmentProgressSummary = (youth: Youth, progressNotes: any[]): string => {
    let summary = "";

    // Therapy participation from youth profile
    if (youth.currentCounseling && youth.currentCounseling.length > 0) {
      summary += `${youth.firstName} is participating in: ${youth.currentCounseling.join(', ')}. `;
      if (youth.therapistName) {
        summary += `Therapist: ${youth.therapistName}. `;
      }
    }

    if (progressNotes.length > 0) {
      const treatmentNotes = progressNotes.filter(note => {
        const content = extractCaseNoteContent(note).toLowerCase();
        return content.includes('therapy') || content.includes('session') ||
          content.includes('coping') || content.includes('intervention') ||
          content.includes('goal') || content.includes('treatment') ||
          content.includes('counsel');
      });

      const highlights = collectCaseNoteHighlights(treatmentNotes.length > 0 ? treatmentNotes : progressNotes, 5);
      if (highlights.length > 0) {
        summary += `Reports from this period document: ${highlights.join(' ')}`;
      } else {
        summary += `${progressNotes.length} reports were documented during this period.`;
      }
    }

    if (!summary) {
      summary = `${youth.firstName} continues to participate in treatment programming.`;
    }

    return summary;
  };

  // Load saved data or auto-populate on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!youth?.id) return;

      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      const saved = localStorage.getItem(saveKey);

      if (saved) {
        // If we have saved data, load it and DON'T auto-populate (preserve manual edits)
        try {
          const savedData = JSON.parse(saved) as MonthlyReportData;
          // Merge with current defaults so any newly-added fields are never undefined
          setReportData(prev => ({ ...prev, ...savedData }));
          console.log('Loaded saved report data from localStorage');
        } catch (error) {
          console.error("Error loading saved data:", error);
          // Only auto-populate if there's an error loading saved data
          await autoPopulateForm();
        }
      } else {
        // No saved data exists, auto-populate form with youth profile data
        console.log('No saved data found, auto-populating form');
        await autoPopulateForm();
      }
    };

    loadData();
  }, [youth?.id, selectedMonth]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = () => {
      if (youth?.id) {
        const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
        localStorage.setItem(saveKey, JSON.stringify(reportData));
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [reportData, youth?.id, selectedMonth]);

  // Helper function to calculate length of stay from admission date
  const calculateLengthOfStayFromDate = (admissionDateStr: string): string => {
    if (!admissionDateStr) return "";
    
    const admissionDate = new Date(admissionDateStr);
    // Set to start of day for date-only comparison
    admissionDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    // Set to start of day for date-only comparison
    now.setHours(0, 0, 0, 0);
    
    // Check if admission date is in the future
    if (admissionDate > now) {
      return "Not yet admitted";
    }
    
    // Calculate years, months, and days
    let years = now.getFullYear() - admissionDate.getFullYear();
    let months = now.getMonth() - admissionDate.getMonth();
    let days = now.getDate() - admissionDate.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    // Build the length of stay string
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    if (days > 0 || parts.length === 0) {
      parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

  const handleFieldChange = (field: keyof MonthlyReportData, value: string) => {
    setReportData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate length of stay when admission date changes
      if (field === 'dateOfAdmission') {
        updated.lengthOfStay = calculateLengthOfStayFromDate(value);
      }
      
      return updated;
    });
  };

  // AI Enhancement Function
  const enhanceTextField = async (fieldName: keyof MonthlyReportData) => {
    const currentValue = reportData[fieldName] as string;
    
    if (!currentValue || !currentValue.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some text first before enhancing",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(fieldName);

    try {
      const prompt = getEnhancementPrompt(fieldName, currentValue);
      const response = await aiService.queryData(prompt, {
        youth,
        currentText: currentValue,
        fieldType: fieldName
      });

      if (response.success && response.data?.answer) {
        const enhancedText = response.data.answer;
        handleFieldChange(fieldName, enhancedText);
        toast({
          title: "Success",
          description: "Text enhanced with AI!",
        });
      } else {
        throw new Error(response.error || 'Failed to enhance text');
      }
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(null);
    }
  };

  const getEnhancementPrompt = (fieldName: keyof MonthlyReportData, currentValue: string): string => {
    const prompts: Record<string, string> = {
      assistanceSummary: `Take this program report for ${youth.firstName} and expand it into a professional summary covering support services, resources, referrals, and advocacy efforts. Do not include any mention of points, scores, or levels:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical language. Do not use markdown formatting.`,

      academicSummary: `Take this academic report for ${youth.firstName} and expand it into a professional summary. Note that ${youth.firstName} attends the Heartland Boys Home Independent School, managed by Berniklau Education Solutions. Do not include any mention of points, scores, or levels:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs. Do not use markdown formatting.`,

      behavioralSummary: `Take this behavioral report for ${youth.firstName} and expand it into a professional summary covering incidents, compliance, response to redirection, and overall behavioral progress. Do not include any mention of points, scores, or levels:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical language. Do not use markdown formatting.`,

      socialSummary: `Take this social development report for ${youth.firstName} and expand it into a comprehensive summary covering peer interactions, relationships with staff, communication skills, and social growth. Do not include any mention of points, scores, or levels:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical language. Do not use markdown formatting.`,

      treatmentProgressSummary: `Take this treatment progress report for ${youth.firstName} and expand it into a comprehensive summary covering therapy participation, clinical observations, and progress. Do not include any mention of points, scores, or levels:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical language. Do not use markdown formatting.`,
    };

    return prompts[fieldName] || `Enhance and expand the following text for ${youth.firstName}'s monthly progress report. Do not include any mention of points, scores, or levels. Do not use markdown formatting:\n\n"${currentValue}"\n\nExpand this into clear, professional paragraphs.`;
  };

  // AI-powered auto-populate ALL sections intelligently
  const handleAIPopulateAll = async () => {
    if (!youth?.id) {
      toast({
        title: "Error",
        description: "No youth selected",
        variant: "destructive"
      });
      return;
    }

    const hasData = reportData.assistanceSummary ||
                    reportData.academicSummary ||
                    reportData.behavioralSummary ||
                    reportData.socialSummary ||
                    reportData.treatmentProgressSummary;

    if (hasData) {
      const confirmed = confirm(
        'Some sections already have content. AI will generate comprehensive summaries for ALL sections based on reports and documentation. Continue?'
      );
      if (!confirmed) return;
    }

    setIsAutoPopulating(true);

    try {
      toast({
        title: "AI Processing",
        description: "Analyzing reports to generate comprehensive summaries...",
      });

      const monthStart = new Date(selectedMonth + "-01");
      const reportMonthLabel = format(monthStart, 'MMMM yyyy');

      // Fetch ALL reports for this youth
      const allProgressNotes = await fetchProgressNotesAPI(youth.id).catch(() => fetchProgressNotes(youth.id));

      // Separate reporting period reports from historical context
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const periodReports = allProgressNotes.filter(note => {
        if (!note.date) return false;
        const d = new Date(note.date);
        return d >= monthStart && d <= monthEnd;
      });

      // Historical context: up to 30 most recent reports outside the reporting period
      const historicalReports = [...allProgressNotes]
        .filter(note => {
          if (!note.date) return false;
          const d = new Date(note.date);
          return d < monthStart;
        })
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 30);

      console.log(`AI populate: ${periodReports.length} reports in period, ${historicalReports.length} historical reports`);

      // First, run basic auto-populate to get demographic data
      await autoPopulateForm();

      // Build reporting period text
      const periodReportsText = periodReports.length > 0
        ? periodReports.map(note => {
            const content = extractCaseNoteContent(note);
            const date = note.date ? format(new Date(note.date), 'MMM d, yyyy') : 'No date';
            return `[${date}] ${content}`;
          }).join('\n\n')
        : 'No reports found for this specific reporting period.';

      // Build historical context text
      const historicalText = historicalReports.length > 0
        ? historicalReports.map(note => {
            const content = extractCaseNoteContent(note);
            const date = note.date ? format(new Date(note.date), 'MMM d, yyyy') : 'No date';
            return `[${date}] ${content}`;
          }).join('\n\n')
        : '';

      const caseNotesText = periodReportsText; // kept for context object below

      const baseInstruction = `You are a clinical professional writing a monthly progress report for ${youth.firstName} ${youth.lastName} at Heartland Boys Home. The reporting period is ${reportMonthLabel}. Write a professional 2-3 paragraph summary. Do not mention points, scores, levels, or ratings. Do not use markdown formatting (no **, no #). Just write plain professional text.

REPORTING PERIOD REPORTS (${reportMonthLabel}):
${periodReportsText}
${historicalText ? `\nHISTORICAL CONTEXT (prior reports for reference on overall progress):\n${historicalText}` : ''}`;

      // Use AI to generate each section based on case notes
      const aiPrompts = {
        assistanceSummary: `${baseInstruction}\n\nUsing the reporting period reports above, focus on: program participation, assistance provided, support services, resources, referrals, advocacy, appointments, and coordination efforts. Reference historical reports only to describe progress over time.`,

        academicSummary: `${baseInstruction}\n\nUsing the reporting period reports above, focus on: academic performance, school attendance, grades, educational progress, and classroom behavior. Note: ${youth.firstName} attends the Heartland Boys Home Independent School, managed by Berniklau Education Solutions. Reference historical reports only to describe progress over time.`,

        behavioralSummary: `${baseInstruction}\n\nUsing the reporting period reports above, focus on: behavioral patterns, incidents, compliance with rules, response to redirection, disciplinary actions, and overall behavioral progress or challenges. Reference historical reports only to describe progress over time.`,

        socialSummary: `${baseInstruction}\n\nUsing the reporting period reports above, focus on: social development, peer interactions, relationships with staff, communication skills, conflict resolution, cooperation, and group dynamics. Reference historical reports only to describe progress over time.`,

        treatmentProgressSummary: `${baseInstruction}\n\nUsing the reporting period reports above, focus on: treatment progress, therapy participation, clinical observations, coping skills, and therapeutic interventions. Reference historical reports only to describe progress over time.\n\nAdditional context:\n- Current Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'Not documented'}\n- Current Counseling: ${youth.currentCounseling?.join(', ') || 'Not specified'}\n- Therapist: ${youth.therapistName || 'Not specified'}`,
      };

      // Generate AI summaries for each section
      const updates: Partial<MonthlyReportData> = {};

      for (const [field, prompt] of Object.entries(aiPrompts)) {
        try {
          const response = await aiService.queryData(prompt, {
            youth,
            reportMonth: reportMonthLabel,
            totalNotesProvided: notesForAI.length,
            caseNotes: caseNotesText
          });

          if (response.success && response.data?.answer) {
            updates[field as keyof MonthlyReportData] = response.data.answer as any;
          }
        } catch (error) {
          console.error(`Error generating ${field}:`, error);
        }
      }

      // Update the report with AI-generated summaries
      setReportData(prev => ({ ...prev, ...updates }));

      toast({
        title: "Success",
        description: "All sections have been populated with AI-generated summaries from reports. Review and edit as needed.",
      });

    } catch (error: any) {
      console.error('AI auto-populate error:', error);
      toast({
        title: "Auto-Populate Failed",
        description: error.message || "Failed to auto-populate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const handleSave = () => {
    try {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.setItem(saveKey, JSON.stringify(reportData));
      toast({
        title: "Report Saved",
        description: "Monthly progress report has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save the report",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const filename = `${buildReportFilename(youth, "Monthly Progress Report")}.pdf`;
      await exportElementToPDF(printRef.current, filename);
      toast({
        title: "Success",
        description: "Monthly progress report PDF has been generated and downloaded",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setReportData({
      fullLegalName: "",
      preferredName: "",
      dateOfBirth: "",
      age: "",
      dateOfAdmission: "",
      lengthOfStay: "",
      currentPlacement: "",
      probationOfficer: "",
      guardiansInfo: "",
      schoolPlacement: "",
      currentGrade: "",
      currentDiagnoses: "",
      assistanceSummary: "",
      incredibleOpportunitySummary: "",
      academicSummary: "",
      behavioralSummary: "",
      socialSummary: "",
      treatmentProgressSummary: "",
      futureGoals: "",
      preparedBy: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      month: format(new Date(), "MMMM"),
      year: format(new Date(), "yyyy")
    });
    
    // Clear saved data
    if (youth?.id) {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.removeItem(saveKey);
    }
    
    toast({
      title: "Form Reset",
      description: "All form data has been cleared",
    });
  };

  if (!youth) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please select a youth to generate a monthly progress report.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Progress Report - {youth.firstName} {youth.lastName}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleAIPopulateAll}
                disabled={isAutoPopulating}
                className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAutoPopulating ? 'Populating...' : 'AI Populate All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Save className="h-4 w-4" />
                Save Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Input
                value={reportData.preparedBy}
                onChange={(e) => handleFieldChange('preparedBy', e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input
                type="date"
                value={reportData.reportDate}
                onChange={(e) => handleFieldChange('reportDate', e.target.value)}
              />
            </div>
          </div>

          {/* Tabbed Form Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="youth-info" className="flex items-center gap-1">
                {isSectionComplete("youth-info") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Youth Info</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="assistance" className="flex items-center gap-1">
                {isSectionComplete("assistance") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Program</span>
                <span className="sm:hidden">Prog</span>
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex items-center gap-1">
                {isSectionComplete("academic") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Academic</span>
                <span className="sm:hidden">Acad</span>
              </TabsTrigger>
              <TabsTrigger value="behavioral" className="flex items-center gap-1">
                {isSectionComplete("behavioral") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Behavioral</span>
                <span className="sm:hidden">Bhvr</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-1">
                {isSectionComplete("social") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Social</span>
                <span className="sm:hidden">Socl</span>
              </TabsTrigger>
              <TabsTrigger value="treatment" className="flex items-center gap-1">
                {isSectionComplete("treatment") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Treatment</span>
                <span className="sm:hidden">Trtmt</span>
              </TabsTrigger>
              <TabsTrigger value="future-goals" className="flex items-center gap-1">
                {isSectionComplete("future-goals") ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Goals</span>
                <span className="sm:hidden">Goal</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Youth Profile Information */}
            <TabsContent value="youth-info" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Youth Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Legal Name</Label>
                    <Input
                      value={reportData.fullLegalName}
                      onChange={(e) => handleFieldChange('fullLegalName', e.target.value)}
                      placeholder="Full legal name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Name</Label>
                    <Input
                      value={reportData.preferredName}
                      onChange={(e) => handleFieldChange('preferredName', e.target.value)}
                      placeholder="Preferred name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={reportData.dateOfBirth}
                      onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      value={reportData.age}
                      onChange={(e) => handleFieldChange('age', e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Admission</Label>
                    <Input
                      type="date"
                      value={reportData.dateOfAdmission}
                      onChange={(e) => handleFieldChange('dateOfAdmission', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Length of Stay</Label>
                    <Input
                      value={reportData.lengthOfStay}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Auto-calculated from admission date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Placement</Label>
                    <Input
                      value={reportData.currentPlacement}
                      onChange={(e) => handleFieldChange('currentPlacement', e.target.value)}
                      placeholder="Current placement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Probation Officer</Label>
                    <Input
                      value={reportData.probationOfficer}
                      onChange={(e) => handleFieldChange('probationOfficer', e.target.value)}
                      placeholder="Probation officer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>School Placement</Label>
                    <Input
                      value={reportData.schoolPlacement}
                      onChange={(e) => handleFieldChange('schoolPlacement', e.target.value)}
                      placeholder="Current school"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Grade</Label>
                    <Input
                      value={reportData.currentGrade}
                      onChange={(e) => handleFieldChange('currentGrade', e.target.value)}
                      placeholder="Current grade"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Guardians Information</Label>
                  <Textarea
                    value={reportData.guardiansInfo}
                    onChange={(e) => handleFieldChange('guardiansInfo', e.target.value)}
                    placeholder="Guardian/parent information"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Diagnoses</Label>
                  <Textarea
                    value={reportData.currentDiagnoses}
                    onChange={(e) => handleFieldChange('currentDiagnoses', e.target.value)}
                    placeholder="Current diagnoses and treatment needs"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Program */}
            <TabsContent value="assistance" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Program</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Summary</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceTextField('assistanceSummary')}
                      disabled={isEnhancing === 'assistanceSummary'}
                      className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEnhancing === 'assistanceSummary' ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={reportData.assistanceSummary}
                    onChange={(e) => handleFieldChange('assistanceSummary', e.target.value)}
                    placeholder="Summary of program participation, assistance provided, support services, resources, referrals, and coordination..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Academic */}
            <TabsContent value="academic" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Academic</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Summary</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceTextField('academicSummary')}
                      disabled={isEnhancing === 'academicSummary'}
                      className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEnhancing === 'academicSummary' ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={reportData.academicSummary}
                    onChange={(e) => handleFieldChange('academicSummary', e.target.value)}
                    placeholder="Academic placement and progress. Auto-populated with Heartland Boys Home Independent School / Berniklau Education Solutions info plus any academic report details..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Behavioral */}
            <TabsContent value="behavioral" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Behavioral</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Summary</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceTextField('behavioralSummary')}
                      disabled={isEnhancing === 'behavioralSummary'}
                      className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEnhancing === 'behavioralSummary' ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={reportData.behavioralSummary}
                    onChange={(e) => handleFieldChange('behavioralSummary', e.target.value)}
                    placeholder="Summary of behavioral patterns, incidents, compliance, response to redirection, and overall behavioral progress drawn from reports..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Social */}
            <TabsContent value="social" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Social Development</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Summary</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceTextField('socialSummary')}
                      disabled={isEnhancing === 'socialSummary'}
                      className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEnhancing === 'socialSummary' ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={reportData.socialSummary}
                    onChange={(e) => handleFieldChange('socialSummary', e.target.value)}
                    placeholder="Summary of social development including peer interactions, staff relationships, communication, and group dynamics..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Treatment Progress */}
            <TabsContent value="treatment" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Treatment Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Summary</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => enhanceTextField('treatmentProgressSummary')}
                      disabled={isEnhancing === 'treatmentProgressSummary'}
                      className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEnhancing === 'treatmentProgressSummary' ? 'Enhancing...' : 'Enhance with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={reportData.treatmentProgressSummary}
                    onChange={(e) => handleFieldChange('treatmentProgressSummary', e.target.value)}
                    placeholder="Summary of treatment progress, therapy participation, and clinical observations..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Future Goals */}
            <TabsContent value="future-goals" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Future Goals</h3>
                <p className="text-sm text-gray-500">Enter each goal on its own line. They will be displayed as a numbered list in the printed report.</p>
                <div className="space-y-2">
                  <Label>Goals (one per line)</Label>
                  <Textarea
                    value={reportData.futureGoals}
                    onChange={(e) => handleFieldChange('futureGoals', e.target.value)}
                    placeholder={"Continue skill development in daily living skills\nMaintain positive peer relationships\nPrepare for next phase of care"}
                    className="min-h-[180px] font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <ReportHeader
          subtitle="Monthly Progress Report"
          detail={format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
        />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <strong>Report Date:</strong>{" "}
            <FormattedText text={reportData.reportDate} />
          </div>
          <div>
            <strong>Prepared By:</strong>{" "}
            <FormattedText text={reportData.preparedBy} />
          </div>
        </div>

        {/* Youth Information */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">1. Youth Profile Information</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Full Legal Name:</strong>{" "}
              <FormattedText text={reportData.fullLegalName || `${youth.firstName} ${youth.lastName}`} />
            </div>
            <div>
              <strong>Preferred Name:</strong>{" "}
              <FormattedText text={reportData.preferredName} />
            </div>
            <div>
              <strong>Date of Birth:</strong>{" "}
              <FormattedText text={reportData.dateOfBirth} />
            </div>
            <div>
              <strong>Age:</strong>{" "}
              <FormattedText text={reportData.age} />
            </div>
            <div>
              <strong>Date of Admission:</strong>{" "}
              <FormattedText text={reportData.dateOfAdmission} />
            </div>
            <div>
              <strong>Length of Stay:</strong>{" "}
              <FormattedText text={reportData.lengthOfStay} />
            </div>
            <div>
              <strong>Current Placement:</strong>{" "}
              <FormattedText text={reportData.currentPlacement} />
            </div>
            <div>
              <strong>Probation Officer:</strong>{" "}
              <FormattedText text={reportData.probationOfficer} />
            </div>
            <div>
              <strong>School Placement:</strong>{" "}
              <FormattedText text={reportData.schoolPlacement} />
            </div>
            <div>
              <strong>Current Grade:</strong>{" "}
              <FormattedText text={reportData.currentGrade} />
            </div>
            <div>
              <strong>Guardians Information:</strong>{" "}
              <FormattedText text={reportData.guardiansInfo} />
            </div>
            <div>
              <strong>Current Diagnoses:</strong>{" "}
              <FormattedText text={reportData.currentDiagnoses} />
            </div>
          </div>
        </div>

        {/* Program */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">2. Program</h3>
          <FormattedText text={reportData.assistanceSummary} as="div" className="ml-4" />
        </div>

        {/* Academic */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">3. Academic</h3>
          <FormattedText text={reportData.academicSummary} as="div" className="ml-4" />
        </div>

        {/* Behavioral */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">4. Behavioral</h3>
          <FormattedText text={reportData.behavioralSummary} as="div" className="ml-4" />
        </div>

        {/* Social Development */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">5. Social Development</h3>
          <FormattedText text={reportData.socialSummary} as="div" className="ml-4" />
        </div>

        {/* Treatment Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">6. Treatment Progress</h3>
          <FormattedText text={reportData.treatmentProgressSummary} as="div" className="ml-4" />
        </div>

        {/* Future Goals */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">7. Future Goals</h3>
          <ol className="list-decimal ml-8 space-y-1">
            {(reportData.futureGoals ?? '')
              .split('\n')
              .map(g => g.trim())
              .filter(Boolean)
              .map((goal, i) => (
                <li key={i}>{goal}</li>
              ))
            }
          </ol>
          {!(reportData.futureGoals ?? '').trim() && (
            <p className="ml-4 text-gray-400 italic">No goals entered.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-8">
          <div className="text-center text-sm text-gray-600">
            <p>Report generated on {reportData.reportDate}</p>
            <p>Prepared by: {reportData.preparedBy}</p>
            <p>Heartland Boys Home - Monthly Progress Report</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            
            .print-section,
            .print-section * {
              visibility: visible;
            }
            
            .print-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 20pt !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
              box-shadow: none !important;
              border: none !important;
            }
            
            .print-section h1 {
              font-size: 20pt !important;
              margin-bottom: 12pt !important;
              color: black !important;
            }
            
            .print-section h2 {
              font-size: 16pt !important;
              margin-bottom: 10pt !important;
              color: black !important;
            }
            
            .print-section h3 {
              font-size: 14pt !important;
              margin-bottom: 6pt !important;
              margin-top: 12pt !important;
              color: black !important;
            }
            
            .print-section p, .print-section div {
              font-size: 11pt !important;
              margin-bottom: 6pt !important;
              color: black !important;
            }
            
            .print-section .grid {
              display: block !important;
            }
            
            .print-section .grid-cols-2 > div {
              display: inline-block !important;
              width: 48% !important;
              margin-right: 4% !important;
              vertical-align: top !important;
            }
            
            .print-section .grid-cols-2 > div:nth-child(2n) {
              margin-right: 0 !important;
            }
            
            .print-section .space-y-2 > * + * {
              margin-top: 6pt !important;
            }
            
            .print-section .space-y-4 > * + * {
              margin-top: 12pt !important;
            }
            
            .print-section .space-y-6 > * + * {
              margin-top: 18pt !important;
            }
            
            .print-section .border-b {
              border-bottom: 1pt solid black !important;
              padding-bottom: 6pt !important;
              margin-bottom: 12pt !important;
            }
            
            .print-section .border-t {
              border-top: 1pt solid black !important;
              padding-top: 12pt !important;
              margin-top: 18pt !important;
            }
            
            .print-section strong {
              font-weight: bold !important;
              color: black !important;
            }
            
            .print-section .ml-4 {
              margin-left: 24pt !important;
            }
            
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
            
            .print-section > div {
              page-break-inside: avoid !important;
            }
          }
        `
      }} />
    </div>
  );
};
