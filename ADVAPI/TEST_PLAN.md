# Model Metadata Editing Test Plan

This document outlines how to test the new model metadata editing functionality.

## Prerequisites

1. Make sure the application server is running with `node src/server.js`
2. Navigate to http://localhost:3002 in your browser
3. The default password for editing model metadata is `admin123` (or the value of the `UPLOAD_PASSWORD` environment variable)

## Test Scenarios

### Basic Editing Functionality

1. **Display Model List**
   - Open the application in your browser
   - Verify that the models list is displayed on the left sidebar
   - Confirm that each model has an edit button (pencil icon) 

2. **Open Edit Modal**
   - Click the edit button (✏️) on any model
   - Verify the edit modal opens
   - Confirm the current display name and description are pre-populated if available

3. **Edit Model Information**
   - Change the display name to something unique
   - Add or modify the description text
   - Enter the admin password (`admin123` by default)
   - Click "Save Changes"
   - Verify the modal closes
   - Confirm the model list updates with the new display name and description

4. **Cancel Editing**
   - Click the edit button on a model
   - Make some changes to the form
   - Click "Cancel" or the X button
   - Verify the modal closes without saving changes
   - Confirm the model list still shows the original values

5. **Password Protection**
   - Click the edit button on a model
   - Make some changes
   - Try submitting without a password
   - Verify you get an error about the password being required
   - Enter an incorrect password and submit
   - Verify you get an authentication error
   - Enter the correct password and submit
   - Verify the changes are saved successfully

### Edge Cases

1. **Empty Fields**
   - Edit a model and clear the display name field
   - Submit the form with the correct password
   - Verify that the model falls back to showing the filename

2. **Long Text Handling**
   - Edit a model and enter a very long display name
   - Enter a multi-paragraph description
   - Submit with the correct password
   - Verify the display handles the long text appropriately (ellipsis for truncation)

3. **Special Characters**
   - Edit a model and include special characters in the name and description:
     - Quotes: `"Hello World"`
     - HTML tags: `<b>Bold Text</b>`
     - Unicode: `العربية 中文 Русский`
   - Submit with the correct password
   - Verify the special characters are displayed correctly

4. **Persistence After Refresh**
   - Edit a model and save changes
   - Refresh the browser
   - Verify that your changes are still there

## Troubleshooting

If you encounter issues during testing:

1. Check the browser console for JavaScript errors
2. Check the server console for backend errors
3. Verify that the model_metadata.json file exists in src/data/
4. Ensure you're using the correct admin password

## Expected Results

After implementing the metadata editing functionality:

1. Users can customize how models are displayed in the list
2. Changes persist across browser refreshes
3. The original filename is still visible below the custom display name
4. Password protection prevents unauthorized edits
5. The UI provides clear feedback on the result of edit operations