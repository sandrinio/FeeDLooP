FeedLoop: Final MVP Requirements
I want to create a service for a software development company that lets users (clients and testers) indicate a bug, initiative, or feedback on dev, QA, and stg environments while the service provider is developing a web solution for the user (client).

Integration should be very simple. A script is being put on the frontend, just like a google tag manager or analytical tool is being integrated.

Core MVP Flow
Onboarding & Project Creation: A user signs up as a Project Owner, logs into the portal, and creates their first project.

Team Setup: The Owner navigates to the project settings and invites team members (Members) via their email addresses.

Script Generation & Integration: The Owner copies the unique JavaScript <script> tag and embeds it in their web application.

Widget Activation: A client or tester visiting the web app now sees a subtle, sticky "Feedback" tab.

Feedback Initiation: The user clicks the tab, and a form slides out where they can select a report type.

Data Capture & Submission: For a "Bug" report, the widget automatically captures diagnostic data. The user writes a description, attaches images, and clicks "Submit."

Portal Update & Collaboration: The new report instantly appears in the project's dashboard, visible to the Owner and all invited Members.

Triage & Archive: Team members can archive reports, moving them from the "Active" view to the "Archived" view to keep the main list clean.

Restore from Archive: If needed, a team member can view the archived reports and restore any item back to the active list.

Export: The Owner or any Member can export the data to a CSV file, formatted for Jira or Azure DevOps.

The Look & Feel
The overall aesthetic will be clean, modern, and minimalist, focusing on clarity and efficiency.

The Feedback Widget (Client-Side Form)
A panel that slides out smoothly from the right side of the screen.

Form Fields:

Report Type (Required): Buttons for Bug, Initiative, Feedback.

Description (Required): A text area (rich text for initiative/feedback).

Attachments (Optional): A drop zone for up to 5 images (paste, drag-drop, click).

Submit Button: A single, prominent button.

The Portal (Dashboard)

Main Dashboard: A page showing cards for each project the user has access to. Each card displays the project name and report count. A prominent "+ Create New Project" button is visible.

Project Workspace: The main area for managing a project.

Reports Tab: A clean table of all submitted reports. Above the table, there will be controls to filter between "Active" and "Archived" reports, alongside the "Export to CSV" button.

In the "Active" view, each row will have an "Archive" icon button.

In the "Archived" view, each row will have a "Restore" (or "Un-archive") icon button to move it back to the active list.

Report Detail View: A slide-over panel showing user submission details and collapsible sections for all diagnostic data.

Settings Tab: Contains the integration snippet, user management, and a "Danger Zone" for project deletion.

Launch Features (MVP)
Auth & Project Portal
The central hub where users manage projects and teams. It handles authentication and provides the core workspace.

Authentication: User can sign up/log in with email and password.

Project Management: User can create, view, and manage multiple projects.

Visibility & Access Control: Projects are only visible to the user who created them and users who have been explicitly invited via their email address.

User Roles & Permissions:

The user who creates a project is the Owner.

The Owner can invite other users to the project as Members.

The Owner can grant specific Members the permission to invite other users.

The Owner can remove any user from the project and can delete the project.

Seamless Invites: No email confirmation is required. When an invited user logs in or refreshes their dashboard, the new project will automatically appear.

Feedback Widget
A lightweight, client-side script that embeds the feedback-collection UI. It will be compatible with standard websites and Single Page Applications (SPAs).

Functionality: Renders a sticky, clickable tab that opens a slide-out form.

Data Capture (for "Bug" reports): Automatically captures URL, browser/OS info, all console logs, and network requests.

Attachments: Allows attaching up to 5 images via paste, drag-and-drop, or file selection.

Rich Text: Provides a simple rich text editor (bold, italics, lists, links) for "Initiative" and "Feedback" types.

Reporting Dashboard & Export
The primary interface within the portal for viewing and exporting collected feedback.

Dashboard: Lists all reports for a selected project with key details and filtering for active/archived reports.

Detailed View: Shows all user-submitted and automatically captured data for a single report.

Export: Generates a CSV file formatted with Title, Description, Type, and Reporter columns.

Tech Choices & Constraints
Framework: Next.js

Authentication: NextAuth.js (Auth.js)

Database: Supabase (self-hosted)

File Storage: MinIO (Self-hosted, S3-compatible)

UI/Styling: Tailwind CSS

Deployment: Coolify on a VPS

UI Library: React