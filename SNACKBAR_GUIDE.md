# Snackbar UI Guide

NetNavigator provides an enhanced snackbar notification system with support for regular messages, indeterminate loading, and progress indicators.

## Basic Snackbar

### showSnackbar(message, duration)

Display a simple notification message.

```javascript
// Show for 3 seconds (default)
UI.showSnackbar('Operation completed');

// Show for custom duration
UI.showSnackbar('Saving...', 5000);

// HTML content supported
UI.showSnackbar('<strong>Success!</strong> Changes saved');
```

**Parameters:**
- `message` (string) - Message to display (HTML supported)
- `duration` (number) - Display duration in milliseconds (default: 3000)

**Features:**
- Auto-dismisses after duration
- Smooth slide-up and fade-out animations
- Centers at bottom of screen

## Indeterminate Loading Snackbar

### showLoadingSnackbar(message)

Display a loading indicator with an animated spinner.

```javascript
const snackbar = UI.showLoadingSnackbar('Processing...');

// Later, close it
UI.hideLoadingSnackbar();
```

**Use Cases:**
- Background tasks
- API calls without progress
- File uploads
- Data synchronization

**Visual:**
```
┌─────────────────────────────────────┐
│ Processing...              [spinner] │
└─────────────────────────────────────┘
```

## Determinate Progress Snackbar

### showProgressSnackbar(message, initialProgress)

Display a loading indicator with progress bar.

```javascript
// Start progress snackbar
const progress = UI.showProgressSnackbar('Uploading...', 0);

// Update progress
progress.updateProgress(25);
progress.updateProgress(50);
progress.updateProgress(75);

// Update message during operation
progress.updateMessage('Uploading: image.jpg');
progress.updateProgress(90);

// Close when done
progress.close();
```

**Return Object Methods:**
- `updateProgress(percent)` - Set progress (0-100)
- `updateMessage(message)` - Change message
- `close(duration)` - Close snackbar with fade animation

**Visual:**
```
┌──────────────────────────────────────┐
│ Uploading...                   75%   │
│ [████████████░░░░░░░░░░░░░░░░░░░░] │
└──────────────────────────────────────┘
```

## Usage Examples

### Example 1: Simple Message

```javascript
function saveDocument() {
    try {
        // Save logic here
        UI.showSnackbar('Document saved successfully', 3000);
    } catch (error) {
        UI.showSnackbar(`Error: ${error.message}`, 4000);
    }
}
```

### Example 2: Background Task

```javascript
async function syncData() {
    UI.showLoadingSnackbar('Syncing data...');
    
    try {
        await performSync();
        UI.hideLoadingSnackbar();
        UI.showSnackbar('Sync completed', 2000);
    } catch (error) {
        UI.hideLoadingSnackbar();
        UI.showSnackbar(`Sync failed: ${error.message}`, 3000);
    }
}
```

### Example 3: File Upload with Progress

```javascript
async function uploadFile(file) {
    const progress = UI.showProgressSnackbar(`Uploading: ${file.name}`, 0);
    
    try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progress.updateProgress(percent);
            }
        });
        
        xhr.addEventListener('load', () => {
            progress.updateProgress(100);
            progress.close(500);
            UI.showSnackbar('File uploaded successfully', 2000);
        });
        
        xhr.addEventListener('error', () => {
            progress.close(500);
            UI.showSnackbar('Upload failed', 3000);
        });
        
        xhr.open('POST', '/upload');
        xhr.send(file);
    } catch (error) {
        progress.close(500);
        UI.showSnackbar(`Error: ${error.message}`, 3000);
    }
}
```

### Example 4: Multi-Step Operation

```javascript
async function complexOperation() {
    const progress = UI.showProgressSnackbar('Starting operation...', 0);
    
    try {
        // Step 1: Initialize
        progress.updateMessage('Step 1: Initializing...');
        await step1();
        progress.updateProgress(25);
        
        // Step 2: Process
        progress.updateMessage('Step 2: Processing data...');
        await step2();
        progress.updateProgress(50);
        
        // Step 3: Validate
        progress.updateMessage('Step 3: Validating...');
        await step3();
        progress.updateProgress(75);
        
        // Step 4: Finalize
        progress.updateMessage('Step 4: Finalizing...');
        await step4();
        progress.updateProgress(100);
        
        // Success
        progress.close(300);
        UI.showSnackbar('Operation completed successfully', 2000);
    } catch (error) {
        progress.close(300);
        UI.showSnackbar(`Operation failed: ${error.message}`, 3000);
    }
}
```

### Example 5: Network Request

```javascript
async function fetchData() {
    UI.showLoadingSnackbar('Loading data...');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        UI.hideLoadingSnackbar();
        UI.showSnackbar(`Loaded ${data.count} items`, 2000);
        
        return data;
    } catch (error) {
        UI.hideLoadingSnackbar();
        UI.showSnackbar(`Failed to load data: ${error.message}`, 3000);
    }
}
```

### Example 6: Batch Operations

```javascript
async function processBatch(items) {
    const progress = UI.showProgressSnackbar(
        `Processing ${items.length} items...`, 
        0
    );
    
    try {
        for (let i = 0; i < items.length; i++) {
            await processItem(items[i]);
            const percentComplete = ((i + 1) / items.length) * 100;
            progress.updateProgress(percentComplete);
            progress.updateMessage(`Processing ${i + 1}/${items.length}`);
        }
        
        progress.updateProgress(100);
        progress.close(300);
        UI.showSnackbar('All items processed', 2000);
    } catch (error) {
        progress.close(300);
        UI.showSnackbar(`Batch processing failed: ${error.message}`, 3000);
    }
}
```

## Method Reference

### UI.showSnackbar(message, duration)
- **Type:** Regular notification
- **Auto-dismiss:** Yes
- **Duration:** Configurable (default 3000ms)

### UI.showLoadingSnackbar(message)
- **Type:** Indeterminate loading
- **Auto-dismiss:** No (manual hideLoadingSnackbar() required)
- **Features:** Animated spinner

### UI.showProgressSnackbar(message, initialProgress)
- **Type:** Determinate progress
- **Auto-dismiss:** No (manual close() required)
- **Features:** Progress bar with percentage

### UI.hideLoadingSnackbar()
- **Type:** Utility
- **Effect:** Closes loading snackbar with animation

## Styling

Snackbars use theme-aware colors:
- **Background:** Dark gradient
- **Text:** White
- **Progress:** Blue-to-purple gradient
- **Spinner:** White with transparency
- **Border:** Semi-transparent white

Responsive sizing:
- **Width:** Min 300px (message) to 400px (loading/progress)
- **Position:** Fixed bottom-center
- **Padding:** Adaptive based on content type

## Best Practices

1. **Keep Messages Short**
   - Max 2-3 words for regular messages
   - 5-10 words for progress messages

2. **Use Appropriate Type**
   - Simple feedback → `showSnackbar()`
   - Unknown duration → `showLoadingSnackbar()`
   - Known duration → `showProgressSnackbar()`

3. **Always Close Progress**
   ```javascript
   // Good
   const progress = UI.showProgressSnackbar(...);
   // ... do work ...
   progress.close();
   
   // Bad - leaves snackbar hanging
   const progress = UI.showProgressSnackbar(...);
   // ... do work ...
   ```

4. **Provide Context**
   ```javascript
   // Good
   progress.updateMessage(`Processing: ${currentFile}`);
   
   // Bad
   progress.updateMessage('Processing');
   ```

5. **Error Handling**
   ```javascript
   try {
       const progress = UI.showProgressSnackbar(...);
       await operation();
       progress.close();
   } catch (error) {
       progress.close(); // Always close in catch!
       UI.showSnackbar(`Error: ${error.message}`);
   }
   ```

## Integration with Other Components

### With Dialog
```javascript
async function dialogWithProgress() {
    const dialog = new Dialog({
        id: 'upload-dialog',
        title: 'Upload File'
    });
    
    const progress = UI.showProgressSnackbar('Uploading...', 0);
    // ... upload logic ...
    progress.close();
    dialog.close();
}
```

### With Network Operations
```javascript
async function scanNetwork() {
    const progress = UI.showProgressSnackbar('Scanning network...', 0);
    
    try {
        const ips = await NetworkOps.scan('192.168.1');
        progress.updateProgress(50);
        
        // Additional processing
        const results = await processIPs(ips);
        progress.updateProgress(100);
        
        progress.close();
        UI.showSnackbar(`Found ${results.length} devices`);
    } catch (error) {
        progress.close();
        UI.showSnackbar(`Scan failed: ${error.message}`);
    }
}
```
