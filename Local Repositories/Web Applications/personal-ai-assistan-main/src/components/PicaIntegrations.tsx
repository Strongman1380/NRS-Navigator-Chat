import { useState, useEffect, useCallback } from "react";
import { useAuthKit } from "@picahq/authkit";
import {
  Link,
  Plus,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Plugs,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Integration {
  _id: string;
  platform: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export function PicaIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const { open } = useAuthKit({
    token: {
      url: "/api/pica-token",
      headers: {},
    },
    onSuccess: (connection) => {
      toast.success(`Connected ${connection.platform || "integration"} successfully!`);
      fetchIntegrations();
    },
    onError: (error) => {
      console.error("AuthKit error:", error);
      toast.error("Failed to connect integration");
    },
    onClose: () => {
      fetchIntegrations();
    },
  });

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pica-integrations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-500/10 text-blue-600",
      instagram: "bg-pink-500/10 text-pink-600",
      linkedin: "bg-sky-500/10 text-sky-600",
      twitter: "bg-neutral-500/10 text-neutral-600",
      google: "bg-red-500/10 text-red-600",
    };
    return colors[platform.toLowerCase()] || "bg-primary/10 text-primary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Plugs weight="duotone" size={24} />
            Integrations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your accounts to post and pull data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIntegrations} disabled={loading}>
            <ArrowsClockwise size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={() => open()}>
            <Plus size={14} className="mr-1" />
            Connect
          </Button>
        </div>
      </div>

      {loading && integrations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowsClockwise size={32} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">Loading integrations...</p>
        </div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Link size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No integrations connected</p>
          <p className="text-sm mb-4">
            Connect Facebook, Instagram, LinkedIn, and more to post and pull data.
          </p>
          <Button onClick={() => open()}>
            <Plus size={14} className="mr-1" />
            Connect Your First Integration
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {integrations.map((integration) => (
            <Card key={integration._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(integration.platform)}`}>
                  <Plugs size={20} weight="duotone" />
                </div>
                <div>
                  <p className="font-medium capitalize">{integration.platform}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.createdAt
                      ? `Connected ${new Date(integration.createdAt).toLocaleDateString()}`
                      : "Connected"}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  integration.status === "active"
                    ? "text-green-600 border-green-200"
                    : "text-yellow-600 border-yellow-200"
                }
              >
                {integration.status === "active" ? (
                  <CheckCircle size={12} className="mr-1" />
                ) : (
                  <Warning size={12} className="mr-1" />
                )}
                {integration.status || "connected"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
