# Supabase Setup Guide for SoundPath

This guide will help you connect SoundPath to Supabase for enterprise-level data scaling.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: SoundPath (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")
3. Copy both values

## Step 3: Configure Environment Variables

1. In the root of your SoundPath project, create a `.env` file (if it doesn't exist)
2. Add the following lines:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Replace `your_project_url_here` with your Project URL
4. Replace `your_anon_key_here` with your anon public key
5. Save the file

**Important**: The `.env` file is in `.gitignore` and should never be committed to version control.

## Step 4: Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the `supabase-schema.sql` file from this project
4. Copy the entire contents
5. Paste it into the SQL Editor
6. Click "Run" (or press Ctrl/Cmd + Enter)
7. Wait for the success message

This will create:
- `artists` table
- `tracks` table
- `votes` table
- `genres` table
- `staff_members` table
- Indexes for performance
- Database triggers for automatic vote recalculation

## Step 5: Verify Setup

1. In Supabase, go to **Table Editor**
2. You should see the following tables:
   - `artists`
   - `tracks`
   - `votes`
   - `genres`
   - `staff_members`
3. Check that default genres and staff members were inserted

## Step 6: Test the Application

1. Start your development server:
   ```bash
   npm run dev
   ```
2. The app should load without errors
3. Try adding a new track - it should save to Supabase
4. Check the Supabase **Table Editor** to see your data

## Troubleshooting

### "Supabase credentials not found" warning
- Make sure your `.env` file is in the project root
- Verify the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after creating/updating `.env`

### Database operations failing
- Check that you ran the SQL schema script
- Verify your API keys are correct
- Check the Supabase dashboard for error logs

### Real-time updates not working
- Ensure Row Level Security (RLS) policies allow read access (if enabled)
- Check browser console for WebSocket connection errors

## Row Level Security (Optional)

By default, Supabase uses Row Level Security. If you want to restrict access:

1. Go to **Authentication** → **Policies** in Supabase
2. Create policies for each table as needed
3. For development, you can temporarily disable RLS:
   ```sql
   ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
   ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
   ALTER TABLE artists DISABLE ROW LEVEL SECURITY;
   ```

**Note**: For production, always use proper RLS policies!

## Data Migration from LocalStorage

If you have existing data in localStorage:

1. Export your localStorage data (check browser DevTools → Application → Local Storage)
2. Use the Supabase dashboard or create a migration script to import the data
3. The app will automatically use Supabase data going forward

## Next Steps

- Set up authentication (if needed)
- Configure backups in Supabase
- Set up monitoring and alerts
- Review and optimize database indexes based on usage patterns
