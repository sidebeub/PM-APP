# KBOM Integration and URN Handling Test Plan

This document outlines how to test the KBOM integration and URN handling functionality.

## Prerequisites

1. Make sure the application server is running with `node src/server.js`
2. Navigate to http://localhost:3002 in your browser
3. Ensure the database contains both model data and KBOM data
4. The default password for editing/uploading models is `admin123`

## Test Scenarios

### KBOM Data Display in Model List

1. **Display Model List with KBOM Data**
   - Open the application in your browser
   - Verify that the models list is displayed on the left sidebar
   - Confirm that models with related KBOM data show customer and sales order information
   - Verify the KBOM information is displayed in a clearly formatted section

2. **Model Matching**
   - Identify a model with filename that contains a part number (e.g., "B2001480.iam.dwf")
   - Verify that KBOM data with matching part number in the title (e.g., "B2001480 Kit Riser Assy Top-Out") is linked to the model
   - Confirm that all matching KBOM records are found

3. **KBOM Data Update**
   - Add a new KBOM record in the database with a title matching an existing model's part number
   - Refresh the model list
   - Verify the model now displays the new KBOM data

### URN Handling in Viewer

1. **Loading Models from List**
   - Click on a model in the list
   - Verify the viewer successfully loads the model
   - No "modelUrn.startsWith is not a function" or similar errors should appear in the console

2. **Loading Models with KBOM Data**
   - Click on a model that has KBOM data
   - Verify the viewer successfully loads the model
   - Confirm that KBOM information is displayed in the viewer overlay
   - Verify the overlay can be closed with the X button

3. **URN Format Validation**
   - Test loading a model with just a string URN (simulate by modifying the code temporarily)
   - Test loading a model with a full model object
   - Verify both approaches work correctly

4. **Error Handling**
   - Try loading a model with an invalid URN format
   - Verify appropriate error messages are displayed

### Edge Cases

1. **Partial URN Formats**
   - Test with a URN that doesn't have the "urn:" prefix
   - Verify the application correctly adds the prefix

2. **Null or Undefined URN**
   - Temporarily modify code to pass null/undefined URN values
   - Verify appropriate error messages are displayed

3. **Invalid Object Structure**
   - Test with model objects missing expected properties
   - Verify fallback mechanisms work correctly

4. **Long KBOM Data**
   - Test with a model that has many related KBOM records
   - Verify the UI handles the display appropriately

## Troubleshooting

If you encounter issues during testing:

1. Check the browser console for JavaScript errors
2. Check the server console for backend errors
3. Verify database connectivity with tables "models" and "kbom"
4. Check network requests for any API failures

## Expected Results

After implementing the KBOM integration and URN handling:

1. Models display related KBOM data in the list view
2. Models load correctly in the viewer regardless of whether they have KBOM data or not
3. KBOM information is displayed as an overlay in the viewer
4. No URN-related errors occur in the console
5. All edge cases are handled gracefully with appropriate user feedback