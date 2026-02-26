# NRS Navigator Setup Guide

## Quick Start

Your NRS Navigator application is now fully configured and ready to use!

## Features Implemented

### 1. Authentication System
- Secure email/password authentication using Supabase
- Admin and user roles
- Protected routes and dashboard access

### 2. Resource Management
- Complete CRUD operations for resources
- Resource types: Shelter, Treatment, Crisis, Food, Medical, Legal, Other
- Availability status tracking
- Contact information and location details
- Service tags and eligibility criteria

### 3. Enhanced AI Response System
- Context-aware pattern matching
- Crisis detection with automatic escalation
- Resource suggestions based on conversation
- Priority assignment (low, medium, high, urgent)
- Follow-up tracking

### 4. Conversation Management
- Real-time messaging with Supabase Realtime
- Priority levels and status tracking
- Assignment system for admins
- Conversation history and search
- Analytics tracking

### 5. Analytics Dashboard
- Total conversations today
- Active chat count
- Conversations needing attention
- Urgent conversation tracking
- Filtering by status and priority

### 6. Mobile-Optimized Design
- Responsive layouts for all screen sizes
- Touch-friendly interface
- Quick action buttons for crisis resources
- Optimized typography and spacing

### 7. Crisis Resources
- Quick dial buttons for 988 (Crisis Lifeline) and 911
- Prominent crisis detection and response
- Suggested resources based on needs

## First Time Setup

### Step 1: Create Your Admin Account

1. Open the application in your browser
2. Click "Need an account? Sign up"
3. Enter your details:
   - Full Name: Brandon (or your name)
   - Email: your email address
   - Password: choose a secure password
4. Click "Create Account"

### Step 2: Promote Yourself to Admin

After creating your account, you need to promote yourself to admin role in the database:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Select the `profiles` table
4. Find your profile row
5. Change the `role` column from `user` to `admin`
6. Save changes
7. Sign out and sign back in

**Option B: Using SQL**
Run this SQL query in Supabase SQL Editor (replace the email):
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 3: Add Initial Resources

1. Click the "Resources" button in the dashboard
2. Click "Add Resource"
3. Fill in resource details
4. Save

Example resources to add:
- Local shelters
- Treatment centers
- Food banks
- Crisis hotlines
- Medical clinics

## Using the System

### As Public User
- Visit the main page
- Chat with the AI Navigator
- Get resource suggestions
- Use quick dial buttons for emergencies

### As Admin
- View all conversations in real-time
- See analytics and metrics
- Manage resource database
- Respond to conversations directly
- Filter by status and priority

## Environment Variables

Your `.env` file should have:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Tables

The following tables are created:
- `profiles` - User profiles with roles
- `conversations` - Chat conversations
- `messages` - Individual messages
- `resources` - Resource directory
- `conversation_tags` - Tags for categorization
- `admin_notes` - Admin notes on conversations
- `conversation_tags_junction` - Tag relationships
- `analytics_events` - Analytics tracking

## Security Features

- Row Level Security (RLS) enabled on all tables
- Admin-only access to resource management
- Public read access to active resources only
- Secure authentication with Supabase Auth
- Password requirements enforced

## Support

For issues or questions:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Verify environment variables are set correctly
4. Ensure database migrations completed successfully

## Next Steps

1. Add your local resources to the database
2. Test the chat flow as a public user
3. Customize AI response patterns in `src/lib/aiResponses.ts`
4. Add more analytics as needed
5. Customize branding and styling

## Tips

- The AI automatically detects crisis keywords and escalates priority
- Conversations marked as "needs_handoff" appear in admin dashboard
- Resources are automatically suggested based on conversation content
- Analytics events are tracked for reporting purposes
- Mobile users can quickly dial 988 or 911 with one tap

Enjoy your NRS Navigator application!
