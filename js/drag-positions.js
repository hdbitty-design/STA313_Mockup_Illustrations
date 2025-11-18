// Draggable Positions Manager
// Allows dragging of annotations, notes, legends, and saving positions to JSON

let positions = null;
let isDragMode = false;

// Load positions from JSON
const loadPositions = async () => {
    try {
        const response = await fetch('data/positions.json');
        positions = await response.json();
        console.log('✓ Positions loaded:', positions);
        return positions;
    } catch (error) {
        console.error('Failed to load positions:', error);
        return null;
    }
};

// Make element draggable
const makeDraggable = (selection, panelId, elementId, updateCallback) => {
    if (!selection.node()) return;

    const drag = d3.drag()
        .on('start', function(event) {
            if (!isDragMode) return;
            d3.select(this)
                .style('cursor', 'grabbing')
                .style('opacity', 0.8);
        })
        .on('drag', function(event) {
            if (!isDragMode) return;

            const currentTransform = d3.select(this).attr('transform') || 'translate(0,0)';
            const match = currentTransform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);

            let x = match ? parseFloat(match[1]) : 0;
            let y = match ? parseFloat(match[2]) : 0;

            x += event.dx;
            y += event.dy;

            d3.select(this).attr('transform', `translate(${x},${y})`);

            // Update positions object
            if (updateCallback) {
                updateCallback(x, y, event);
            }
        })
        .on('end', function(event) {
            if (!isDragMode) return;
            d3.select(this)
                .style('cursor', 'grab')
                .style('opacity', 1);
        });

    selection.call(drag);

    if (isDragMode) {
        selection.style('cursor', 'grab');
    }
};

// Make floating note draggable
const makeDivDraggable = (element, panelId, elementId) => {
    if (!element) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop, initialRight, initialBottom;

    element.addEventListener('mousedown', (e) => {
        if (!isDragMode) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const computedStyle = window.getComputedStyle(element);
        initialLeft = parseInt(computedStyle.left) || 0;
        initialTop = parseInt(computedStyle.top) || 0;
        initialRight = parseInt(computedStyle.right) || 0;
        initialBottom = parseInt(computedStyle.bottom) || 0;

        element.style.cursor = 'grabbing';
        element.style.opacity = '0.8';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !isDragMode) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // If element uses bottom/right positioning
        if (element.style.bottom) {
            element.style.bottom = (initialBottom - dy) + 'px';
            element.style.top = 'auto';
        } else {
            element.style.top = (initialTop + dy) + 'px';
            element.style.bottom = 'auto';
        }

        if (element.style.right) {
            element.style.right = (initialRight - dx) + 'px';
            element.style.left = 'auto';
        } else {
            element.style.left = (initialLeft + dx) + 'px';
            element.style.right = 'auto';
        }

        // Update positions object
        const newPos = {};
        if (element.style.bottom && element.style.bottom !== 'auto') {
            newPos.bottom = parseInt(element.style.bottom);
        }
        if (element.style.top && element.style.top !== 'auto') {
            newPos.top = parseInt(element.style.top);
        }
        if (element.style.left && element.style.left !== 'auto') {
            newPos.left = parseInt(element.style.left);
        }
        if (element.style.right && element.style.right !== 'auto') {
            newPos.right = parseInt(element.style.right);
        }

        if (positions && positions[panelId]) {
            positions[panelId][elementId] = newPos;
        }
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.opacity = '1';
    });
};

// Save positions to JSON file
const savePositions = async () => {
    if (!positions) {
        console.warn('No positions to save');
        return;
    }

    const jsonString = JSON.stringify(positions, null, 2);

    try {
        // Try to use File System Access API (modern browsers)
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'positions.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();

            console.log('✓ Positions saved successfully!');
            showSaveNotification('Positions saved to file!');
        } else {
            // Fallback: download as file
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'positions.json';
            a.click();
            URL.revokeObjectURL(url);

            console.log('✓ Positions downloaded!');
            showSaveNotification('Positions downloaded! Replace data/positions.json with this file.');
        }
    } catch (error) {
        console.error('Failed to save positions:', error);

        // Ultimate fallback: copy to clipboard
        navigator.clipboard.writeText(jsonString).then(() => {
            console.log('✓ Positions copied to clipboard!');
            showSaveNotification('Positions copied to clipboard! Paste into data/positions.json');
        });
    }
};

// Show save notification
const showSaveNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #06a77d;
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        10%, 90% { opacity: 1; }
    }

    .drag-mode-active {
        outline: 2px dashed #4361ee !important;
        outline-offset: 2px;
    }

    .drag-mode-active:hover {
        outline-color: #06a77d !important;
    }
`;
document.head.appendChild(style);

// Toggle drag mode
const toggleDragMode = () => {
    isDragMode = !isDragMode;

    const allDraggables = document.querySelectorAll('.draggable');
    allDraggables.forEach(el => {
        if (isDragMode) {
            el.classList.add('drag-mode-active');
            el.style.cursor = 'grab';
        } else {
            el.classList.remove('drag-mode-active');
            el.style.cursor = 'default';
        }
    });

    // Show mode notification
    const mode = isDragMode ? 'ON' : 'OFF';
    const color = isDragMode ? '#4361ee' : '#6c757d';
    showModeNotification(`Drag Mode: ${mode}`, color);
};

// Show mode notification
const showModeNotification = (message, color) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 1500);
};

// Add slide animations
const slideStyle = document.createElement('style');
slideStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(slideStyle);

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPositions,
        makeDraggable,
        makeDivDraggable,
        savePositions,
        toggleDragMode
    };
}
