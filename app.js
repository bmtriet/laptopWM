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
    fbid: document.getElementById('displayFBID'),
};

// Internal Spec State
let parsedSpecs = {
    laptop_model: "",
    cpu: "",
    gpu: "",
    ssd: "",
    ram: "",
    monitor_size: "",
    fbid: ""
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
        if (specDisplays.fbid) specDisplays.fbid.innerText = parsedSpecs.fbid || "";
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
            specInputs.json.value = `{
  "laptop_model": "Lenovo ThinkPad X1 Extreme Gen 3",
  "cpu": "Intel Core i7-10750H",
  "gpu": "NVIDIA RTX 1650Ti Max-Q",
  "ssd": "512GB NVMe",
  "monitor_size": "15.6\\" Full HD",
  "ram": "16GB DDR4",
  "price": "16.000.000 VND",
  "fbid": "122170759358625322"
}`;
        }

        resizeCanvas();
        updateLabels();
        updateFooterDisplay();
    } else {
        specInputs.json.value = `{
  "laptop_model": "Lenovo ThinkPad X1 Extreme Gen 3",
  "cpu": "Intel Core i7-10750H",
  "gpu": "NVIDIA RTX 1650Ti Max-Q",
  "ssd": "512GB NVMe",
  "monitor_size": "15.6\\" Full HD",
  "ram": "16GB DDR4",
  "price": "16.000.000 VND",
  "fbid": "122170759358625322"
}`;
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
        const { w, h } = getPastedImageBounds();
        if (mouseX >= imgPos.x - w / 2 && mouseX <= imgPos.x + w / 2 &&
            mouseY >= imgPos.y - h / 2 && mouseY <= imgPos.y + h / 2) {
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

function getPastedImageBounds() {
    if (!pastedImage) return { w: 0, h: 0 };
    const size = parseInt(inputs.imageSize.value);
    const aspect = pastedImage.width / pastedImage.height;
    let w, h;
    if (aspect > 1) {
        w = size;
        h = size / aspect;
    } else {
        h = size;
        w = size * aspect;
    }
    return { w, h };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (pastedImage) {
        const { w, h } = getPastedImageBounds();
        const radius = parseInt(inputs.borderRadius.value);
        const shadowCol = inputs.shadowColor.value;
        const shadowStr = parseInt(inputs.shadowStrength.value);

        ctx.save();
        if (shadowStr > 0) {
            ctx.shadowColor = shadowCol;
            ctx.shadowBlur = shadowStr;
        }

        ctx.beginPath();
        const x = imgPos.x - w / 2;
        const y = imgPos.y - h / 2;

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

        ctx.save();
        ctx.clip();
        ctx.drawImage(pastedImage, x, y, w, h);
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

function drawSpecIcon(type, x, y, size = 20) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const cx = x + size / 2;
    const cy = y - size / 2 + 5; // Adjustment for baseline

    if (type === 'cpu') {
        const s = size * 0.7;
        ctx.rect(cx - s / 2, cy - s / 2, s, s);
        // Pins
        for (let i = -1; i <= 1; i++) {
            ctx.moveTo(cx - s / 2 - 3, cy + i * 4); ctx.lineTo(cx - s / 2, cy + i * 4);
            ctx.moveTo(cx + s / 2, cy + i * 4); ctx.lineTo(cx + s / 2 + 3, cy + i * 4);
            ctx.moveTo(cx + i * 4, cy - s / 2 - 3); ctx.lineTo(cx + i * 4, cy - s / 2);
            ctx.moveTo(cx + i * 4, cy + s / 2); ctx.lineTo(cx + i * 4, cy + s / 2 + 3);
        }
    } else if (type === 'ram') {
        const w = size * 0.9;
        const h = size * 0.4;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        for (let i = -2; i <= 2; i++) {
            ctx.moveTo(cx + i * 3, cy + h / 2); ctx.lineTo(cx + i * 3, cy + h / 2 - 3);
        }
    } else if (type === 'gpu') {
        const w = size * 0.9;
        const h = size * 0.5;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        ctx.arc(cx - 2, cy, h * 0.3, 0, Math.PI * 2);
        ctx.moveTo(cx + 4, cy - 2); ctx.lineTo(cx + 8, cy - 2);
        ctx.moveTo(cx + 4, cy + 2); ctx.lineTo(cx + 8, cy + 2);
    } else if (type === 'ssd') {
        const w = size * 0.4;
        const h = size * 0.9;
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        ctx.moveTo(cx - w / 2, cy - h / 2 + 4); ctx.lineTo(cx + w / 2, cy - h / 2 + 4);
        ctx.moveTo(cx - 1, cy + 4); ctx.lineTo(cx - 1, cy + 8);
        ctx.moveTo(cx + 1, cy + 4); ctx.lineTo(cx + 1, cy + 8);
    } else if (type === 'display') {
        const w = size * 0.9;
        const h = size * 0.6;
        ctx.rect(cx - w / 2, cy - h / 2 - 2, w, h);
        ctx.moveTo(cx - 4, cy + h / 2 + 2); ctx.lineTo(cx + 4, cy + h / 2 + 2);
        ctx.moveTo(cx, cy + h / 2 - 2); ctx.lineTo(cx, cy + h / 2 + 2);
    } else if (type === 'fbid') {
        const s = size * 0.8;
        ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
        // Simplified 'f'
        ctx.moveTo(cx + 2, cy + 4); ctx.lineTo(cx + 2, cy - 2);
        ctx.quadraticCurveTo(cx + 2, cy - 4, cx, cy - 4);
        ctx.moveTo(cx - 1, cy - 1); ctx.lineTo(cx + 4, cy - 1);
    }

    ctx.stroke();
}

function drawGlassFooterOnCanvas() {
    const margin = 24;
    const padding = 28;
    const w = canvas.width - margin * 2;
    const h = 200; // Adjusted for more info
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
    ctx.filter = 'blur(25px)';
    drawBackground();
    if (pastedImage) {
        const { w: imgW, h: imgH } = getPastedImageBounds();
        const px = imgPos.x - imgW / 2;
        const py = imgPos.y - imgH / 2;
        ctx.drawImage(pastedImage, px, py, imgW, imgH);
    }
    ctx.restore();

    // Glass Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Laptop Model (Header)
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = '700 32px Outfit, sans-serif';
    ctx.fillText(parsedSpecs.laptop_model || "Laptop Model", x + padding, y + padding + 25);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding + 52);
    ctx.lineTo(x + w - padding, y + padding + 52);
    ctx.stroke();

    // Specs Grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '500 19px Inter, sans-serif'; // Slightly smaller to fit icons nicely

    const gridY = y + padding + 95;
    const availableWidth = w - padding * 2;
    const rowGap = 50;
    const iconOffset = 30;

    // Column 1: CPU & RAM
    const col1X = x + padding;
    drawSpecIcon('cpu', col1X, gridY);
    ctx.fillText(parsedSpecs.cpu || "CPU", col1X + iconOffset, gridY);

    drawSpecIcon('ram', col1X, gridY + rowGap);
    ctx.fillText(parsedSpecs.ram || "RAM", col1X + iconOffset, gridY + rowGap);

    // Column 2: GPU & SSD
    const col2X = x + padding + availableWidth * 0.35;
    drawSpecIcon('gpu', col2X, gridY);
    ctx.fillText(parsedSpecs.gpu || "GPU", col2X + iconOffset, gridY);

    drawSpecIcon('ssd', col2X, gridY + rowGap);
    ctx.fillText(parsedSpecs.ssd || "SSD", col2X + iconOffset, gridY + rowGap);

    // Column 3: Monitor Size & FBID
    const col3X = x + padding + availableWidth * 0.7;
    drawSpecIcon('display', col3X, gridY);
    ctx.fillText(parsedSpecs.monitor_size || "Monitor", col3X + iconOffset, gridY);

    drawSpecIcon('fbid', col3X, gridY + rowGap);
    ctx.fillText(parsedSpecs.fbid || "FBID", col3X + iconOffset, gridY + rowGap);

    ctx.restore();
}

function downloadImage() {
    render();

    const link = document.createElement('a');
    link.download = `vibecanvas-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
