# Sidebar Anything Chrome Extension

A powerful Chrome extension that enables you to open any website in the sidebar with advanced capabilities for bypassing common restrictions.

## Overview
Sidebar Anything allows you to add, organize, and switch between multiple sidebar entries. The extension specializes in bypassing common web restrictions, including X-Frame-Options and content copy protection, allowing you to view and interact with virtually any website in your Chrome sidebar.

## Key Features
- **Save Multiple Sidebar Entries**: Create a personalized collection of named website entries
- **Advanced Iframe Bypass**: View websites that normally block embedding through X-Frame-Options
- **Copy Protection Bypass**: Extract text from websites that restrict copying
- **Reader View**: Clean, distraction-free reading experience for content-heavy sites
- **Customizable Settings**: Adjust the appearance and behavior to your preferences
- **Easy Navigation**: Quick switching between saved sidebar entries

## Why I Made This
I created this extension to easily access all my AI websites in one place, avoiding the hassle of constantly switching between tabs.

## Technical Capabilities
- Dynamically modifies response headers to bypass X-Frame-Options restrictions
- Injects content scripts to override copy protection mechanisms
- Extracts and reformats content for reader view when direct embedding fails
- Automatically fixes relative URLs in extracted content

## Usage
1. Click the extension icon to open the popup
2. Add a name and URL, then click "Add Sidebar Entry"
3. Select an entry and use "Open in Sidebar" to view the website
4. Use the copy button in the sidebar to extract selected text
5. If a site cannot be loaded directly, the extension will offer Reader View

## Development
- **manifest.json**: Extension configuration and permissions
- **popup.html/js**: UI for managing sidebar entries
- **sidebar.html/js**: Displays websites with advanced bypass features
- **background.js**: Handles header modifications and message routing
- **contentScript.js**: Injects code to bypass client-side restrictions

## Privacy & Security
Sidebar Anything operates entirely within your browser. No data is sent to external servers, and all entries are stored in your local Chrome storage.

## Browser Support
Currently available for Chrome and Chromium-based browsers that support the sidebar API.
