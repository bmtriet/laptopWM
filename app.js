const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('pasteOverlay');

// Inputs
const inputs = {
    canvasWidth: document.getElementById('canvasWidth'),
    canvasHeight: document.getElementById('canvasHeight'),
    imageSize: document.getElementById('imageSize'),
    borderRadius: document.getElementById('borderRadius'),
    shadowColor: document.getElementById('shadowColor'),
    shadowStrength: document.getElementById('shadowStrength'),
};

const displayValues = {
    imageSize: document.getElementById('imageSizeValue'),
    borderRadius: document.getElementById('borderRadiusValue'),
    shadowStrength: document.getElementById('shadowStrengthValue'),
};

const specInputs = {
    json: document.getElementById('specJSON'),
};

const specDisplays = {
    cpu: document.getElementById('displayCPU'),
    gpu: document.getElementById('displayGPU'),
    ram: document.getElementById('displayRAM'),
    ssd: document.getElementById('displaySSD'),
    display: document.getElementById('displayDisplay'),
};

// Internal Spec State
let parsedSpecs = {
    laptop_model: "ThinkPad P17 Gen 2",
    cpu: "Intel Core i9-11950H",
    gpu: "NVIDIA RTX A5000 16GB",
    ssd: "1TB NVMe",
    ram: "32GB DDR4",
    monitor_size: "17.3 inch 4K UHD"
};

// State
let bgImage = new Image();
let logoImage = new Image();
let pastedImage = null;
let isDragging = false;
let isDraggingBG = false;
let isDraggingLogo = false;
let imgPos = { x: 0, y: 0 };
let bgPos = { x: 0, y: 0 };
let logoPos = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };
const logoSize = 100;

// Initialize Background & Logo
bgImage.src = 'bg.jpg';
logoImage.src = 'logo.jpg';

bgImage.onload = () => {
    loadSettings();
    render();
};

logoImage.onload = () => {
    if (logoPos.x === 0 && logoPos.y === 0) {
        // Initial position: top right
        logoPos = { x: canvas.width - 80, y: 80 };
    }
    render();
};

// Setup Listeners
Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => {
        if (input.id === 'canvasWidth' || input.id === 'canvasHeight') resizeCanvas();
        updateLabels();
        saveSettings();
        render();
    });
});

Object.values(specInputs).forEach(input => {
    input.addEventListener('input', () => {
        saveSettings();
        updateFooterDisplay();
        render();
    });
});

document.getElementById('downloadBtn').addEventListener('click', downloadImage);

function updateLabels() {
    displayValues.imageSize.innerText = inputs.imageSize.value;
    displayValues.borderRadius.innerText = inputs.borderRadius.value;
    displayValues.shadowStrength.innerText = inputs.shadowStrength.value;
}

function updateFooterDisplay() {
    try {
        const json = JSON.parse(specInputs.json.value);
        parsedSpecs = { ...parsedSpecs, ...json };

        // Update DOM display if elements exist
        if (specDisplays.cpu) specDisplays.cpu.innerText = parsedSpecs.cpu || "";
        if (specDisplays.gpu) specDisplays.gpu.innerText = parsedSpecs.gpu || "";
        if (specDisplays.ram) specDisplays.ram.innerText = parsedSpecs.ram || "";
        if (specDisplays.ssd) specDisplays.ssd.innerText = parsedSpecs.ssd || "";
        if (specDisplays.display) specDisplays.display.innerText = parsedSpecs.monitor_size || "";
    } catch (e) {
        // Silently fail or log for debug
    }
}

function saveSettings() {
    const settings = {
        canvasWidth: inputs.canvasWidth.value,
        canvasHeight: inputs.canvasHeight.value,
        imageSize: inputs.imageSize.value,
        borderRadius: inputs.borderRadius.value,
        shadowColor: inputs.shadowColor.value,
        shadowStrength: inputs.shadowStrength.value,
        bgPos: bgPos,
        logoPos: logoPos,
        specJSON: specInputs.json.value
    };
    localStorage.setItem('vibeCanvasSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('vibeCanvasSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        inputs.canvasWidth.value = settings.canvasWidth;
        inputs.canvasHeight.value = settings.canvasHeight;
        inputs.imageSize.value = settings.imageSize;
        inputs.borderRadius.value = settings.borderRadius;
        inputs.shadowColor.value = settings.shadowColor;
        inputs.shadowStrength.value = settings.shadowStrength;

        if (settings.bgPos) bgPos = settings.bgPos;
        if (settings.logoPos) logoPos = settings.logoPos;

        if (settings.specJSON) {
            specInputs.json.value = settings.specJSON;
        } else {
            // Default placeholder if none saved
            specInputs.json.value = JSON.stringify(parsedSpecs, null, 2);
        }

        resizeCanvas();
        updateLabels();
        updateFooterDisplay();
    } else {
        // Set default JSON if no settings
        specInputs.json.value = JSON.stringify(parsedSpecs, null, 2);
        updateFooterDisplay();
    }
}

function resizeCanvas() {
    canvas.width = parseInt(inputs.canvasWidth.value) || 900;
    canvas.height = parseInt(inputs.canvasHeight.value) || 1080;
}

// Initial resize
resizeCanvas();

// Handle Paste
window.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    pastedImage = img;
                    imgPos = { x: canvas.width / 2, y: canvas.height / 2 };
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.style.display = 'none', 300);
                    render();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(blob);
        }
    }
});

// Drag Logic
canvas.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', drag);
window.addEventListener('mouseup', stopDrag);

// Touch support
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY });
    canvas.dispatchEvent(mouseEvent);
}, { passive: false });

function startDrag(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check Logo Drag First (Top Layer)
    const distLogo = Math.sqrt((mouseX - logoPos.x) ** 2 + (mouseY - logoPos.y) ** 2);
    if (distLogo <= logoSize / 2) {
        isDraggingLogo = true;
        dragOffset.x = mouseX - logoPos.x;
        dragOffset.y = mouseY - logoPos.y;
        return;
    }

    if (pastedImage) {
        const size = parseInt(inputs.imageSize.value);
        if (mouseX >= imgPos.x - size / 2 && mouseX <= imgPos.x + size / 2 &&
            mouseY >= imgPos.y - size / 2 && mouseY <= imgPos.y + size / 2) {
            isDragging = true;
            dragOffset.x = mouseX - imgPos.x;
            dragOffset.y = mouseY - imgPos.y;
            return;
        }
    }

    // Otherwise, drag background
    isDraggingBG = true;
    dragOffset.x = mouseX - bgPos.x;
    dragOffset.y = mouseY - bgPos.y;
}

function drag(e) {
    if (!isDragging && !isDraggingBG && !isDraggingLogo) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (isDraggingLogo) {
        logoPos.x = mouseX - dragOffset.x;
        logoPos.y = mouseY - dragOffset.y;
    } else if (isDragging) {
        imgPos.x = mouseX - dragOffset.x;
        imgPos.y = mouseY - dragOffset.y;
    } else if (isDraggingBG) {
        bgPos.x = mouseX - dragOffset.x;
        bgPos.y = mouseY - dragOffset.y;
    }
    render();
}

function stopDrag() {
    if (isDraggingBG || isDraggingLogo) saveSettings();
    isDragging = false;
    isDraggingBG = false;
    isDraggingLogo = false;
}

function drawBackground() {
    const cw = canvas.width;
    const ch = canvas.height;
    if (bgImage.complete && bgImage.width > 0) {
        const iw = bgImage.width;
        const ih = bgImage.height;
        const r = Math.max(cw / iw, ch / ih);
        const nw = iw * r;
        const nh = ih * r;
        // Default cover offset + user offset
        const nx = (cw - nw) / 2 + bgPos.x;
        const ny = (ch - nh) / 2 + bgPos.y;
        ctx.drawImage(bgImage, nx, ny, nw, nh);
    } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, cw, ch);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (pastedImage) {
        const size = parseInt(inputs.imageSize.value);
        const radius = parseInt(inputs.borderRadius.value);
        const shadowCol = inputs.shadowColor.value;
        const shadowStr = parseInt(inputs.shadowStrength.value);

        ctx.save();
        if (shadowStr > 0) {
            ctx.shadowColor = shadowCol;
            ctx.shadowBlur = shadowStr;
        }

        ctx.beginPath();
        const x = imgPos.x - size / 2;
        const y = imgPos.y - size / 2;

        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.save();
        ctx.clip();
        const s_iw = pastedImage.width;
        const s_ih = pastedImage.height;
        const s_ratio = Math.max(size / s_iw, size / s_ih);
        const s_nw = s_iw * s_ratio;
        const s_nh = s_ih * s_ratio;
        ctx.drawImage(pastedImage, x + (size - s_nw) / 2, y + (size - s_nh) / 2, s_nw, s_nh);
        ctx.restore();
        ctx.restore();
    }

    // Render Logo
    if (logoImage.complete && logoImage.width > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoPos.x, logoPos.y, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImage, logoPos.x - logoSize / 2, logoPos.y - logoSize / 2, logoSize, logoSize);
        ctx.restore();
    }

    drawGlassFooterOnCanvas();
    updateFooterDisplay();
}

function drawGlassFooterOnCanvas() {
    const margin = 24;
    const padding = 24;
    const w = canvas.width - margin * 2;
    const h = 160; // Increased height for better spacing
    const x = margin;
    const y = canvas.height - margin - h;
    const radius = 12;

    ctx.save();

    // Create Footer Path
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    // Backdrop Blur Trick
    ctx.save();
    ctx.clip();
    ctx.filter = 'blur(20px)';
    drawBackground();
    if (pastedImage) {
        const size = parseInt(inputs.imageSize.value);
        const px = imgPos.x - size / 2;
        const py = imgPos.y - size / 2;
        const s_iw = pastedImage.width;
        const s_ih = pastedImage.height;
        const s_ratio = Math.max(size / s_iw, size / s_ih);
        const s_nw = s_iw * s_ratio;
        const s_nh = s_ih * s_ratio;
        ctx.drawImage(pastedImage, px + (size - s_nw) / 2, py + (size - s_nh) / 2, s_nw, s_nh);
    }
    ctx.restore();

    // Glass Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; // Slightly darker for better readability
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Laptop Model (Header)
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = '700 24px Outfit, sans-serif';
    ctx.fillText(parsedSpecs.laptop_model || "Laptop Model", x + padding, y + padding + 15);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding + 35);
    ctx.lineTo(x + w - padding, y + padding + 35);
    ctx.stroke();

    // Specs Grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '400 16px Inter, sans-serif';

    const gridY = y + padding + 65;
    // Left col
    ctx.fillText(parsedSpecs.cpu || "", x + padding, gridY);
    ctx.fillText(parsedSpecs.ram || "", x + padding, gridY + 32);

    // Right col
    const col2X = x + w / 2 + padding;
    ctx.fillText(parsedSpecs.gpu || "", col2X, gridY);
    ctx.fillText(parsedSpecs.ssd || "", col2X, gridY + 32);

    // Monitor Size (Footer)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '400 14px Inter, sans-serif';
    ctx.fillText(parsedSpecs.monitor_size || "", x + padding, y + h - padding + 5);

    ctx.restore();
}

function downloadImage() {
    render();

    const link = document.createElement('a');
    link.download = `vibecanvas-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
