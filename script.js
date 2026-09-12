/* =========================================================
   THIỆP MỜI TỐT NGHIỆP - ✨ MESMERIZING CONTROLLER ✨
   ========================================================= */

// TOÀN BỘ BIẾN TRẠNG THÁI KHỞI TẠO TẠI ĐẦU FILE (TRÁNH LỖI TDZ)
let currentSlide = 0;
const totalSlides = 5;
let currentYearIndex = 0; // 0: Năm 1, 1: Năm 2, 2: Năm 3, 3: Năm 4
let isVideoPlaying = false; // Tắt tự động phát video - người dùng chủ động bấm chuyển xem
let videoTimer = null;
let superheroTransformTimer = null;
let draggedSticker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let stickerEditMode = false;
let editMode = false;
const EDIT_STORAGE_KEY = 'thiep_text_edits';
const DELETED_OBJECTS_KEY = 'thiep_deleted_objects';

// ==========================================
// 1. SLIDE NAVIGATION & PROGRESS BAR
// ==========================================
function updateSlide() {
    for (let i = 0; i < totalSlides; i++) {
        const slide = document.getElementById(`slide-${i}`);
        const bar = document.getElementById(`bar-${i}`);

        if (slide) {
            if (i === currentSlide) {
                slide.style.display = 'flex';
                slide.scrollTop = 0;
                slide.classList.remove('opacity-0', 'pointer-events-none');
                slide.classList.add('opacity-100', 'z-30');
            } else {
                slide.style.display = 'none';
                slide.classList.add('opacity-0', 'pointer-events-none');
                slide.classList.remove('opacity-100', 'z-30');
            }
        }

        if (bar) {
            bar.style.width = (i <= currentSlide) ? '100%' : '0%';
        }
    }

    const prevBtn = document.getElementById('btn-prev');
    const nextBtnText = document.getElementById('btn-next-text');

    if (prevBtn) {
        prevBtn.disabled = (currentSlide === 0);
    }

    if (nextBtnText) {
        if (currentSlide === totalSlides - 1) {
            nextBtnText.innerText = 'Xem lại 🔄';
        } else {
            nextBtnText.innerText = 'Tiếp theo';
        }
    }

    // Bắn pháo hoa ở các mốc slide quan trọng
    if (currentSlide === 1 || currentSlide === 2 || currentSlide === 4) {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 65,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    // Tắt tự động phát video - người dùng chủ động bấm xem
    if (typeof pauseVideoTimer === 'function') {
        pauseVideoTimer();
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        currentSlide++;
    } else {
        currentSlide = 0;
    }
    updateSlide();
}

function prevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
    }
}

function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
        currentSlide = index;
        updateSlide();
    }
}

function setGuestName(name) {
    const input = document.getElementById('guest-name-input');
    if (input) {
        input.value = name;
        if (typeof confetti === 'function') {
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
        }
    }
}

// ==========================================
// 2. INTERACTIVE TAP PARTICLES
// ==========================================
function createTapParticle(e) {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') ||
        e.target.closest('.draggable-sticker') || e.target.closest('.editable-text')) {
        return;
    }

    const emojis = ['✨', '💖', '🎓', '🧋', '🎉', '🌟', '💥', '🔥', '🫧', '⭐'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    const particle = document.createElement('div');
    particle.className = 'tap-particle text-2xl font-bold';
    particle.innerText = emoji;

    const container = document.getElementById('card-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - 12;
    const y = e.clientY - rect.top - 12;

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    container.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}

// ==========================================
// 3. SMART ADAPTIVE PHOTO FRAMES (TỰ CĂN CHỈNH KHUNG ẢNH ĐẸP NHẤT)
// ==========================================

const PHOTO_STORAGE_KEYS = {
    s1: { src: 'thiep_photo_s1_src', fit: 'thiep_photo_s1_fit', ratio: 'thiep_photo_s1_ratio' },
    s4: { src: 'thiep_photo_s4_src', fit: 'thiep_photo_s4_fit', ratio: 'thiep_photo_s4_ratio' }
};

// Hàm tính toán và tự động căn chỉnh khung ảnh ôm khít & lấp kín 100% bức ảnh thực tế
function applySmartPhotoLayout(slot, imageSrc, customFitMode = null, shouldSave = true) {
    const isS1 = slot === 's1';
    const boxContainer = document.getElementById(isS1 ? 'box-s1-photo' : 'box-s4-photo');
    const frameEl = document.getElementById(isS1 ? 'photo-frame-s1' : 'photo-frame-s4');
    const imgEl = document.getElementById(isS1 ? 'uploaded-img' : 'uploaded-img-2');
    const ambientEl = document.getElementById(isS1 ? 'uploaded-img-ambient' : 'uploaded-img-2-ambient');
    const defaultGraphic = document.getElementById(isS1 ? 'default-photo-graphic' : 'default-photo-graphic-2');
    const toolsEl = document.getElementById(isS1 ? 'photo-tools-s1' : 'photo-tools-s4');
    const btnText = document.getElementById(isS1 ? 'upload-btn-text' : 'upload-btn-text-2');

    if (!frameEl || !imgEl) return;

    // Tải ảnh vào đối tượng Image ngầm để đo kích thước tự nhiên chính xác 100%
    const tempImg = new Image();
    tempImg.onload = function() {
        const naturalW = tempImg.naturalWidth || 400;
        const naturalH = tempImg.naturalHeight || 400;
        const ratio = naturalW / naturalH; // Chiều rộng / Chiều cao

        // Đo chiều rộng tối đa có thể của khung (theo thẻ card cha)
        const parentWidth = (boxContainer ? boxContainer.clientWidth : 0) || frameEl.parentElement.clientWidth || 340;
        const maxW = Math.min(parentWidth - 6, 360);

        // Chiều cao an toàn tối đa trên màn hình để không che các nút
        const maxH = isS1 
            ? Math.min(430, Math.floor(window.innerHeight * 0.50)) 
            : Math.min(290, Math.floor(window.innerHeight * 0.38));

        let targetW, targetH;

        if (ratio < 1) {
            // ẢNH ĐỨNG / DỌC (Ảnh chân dung tốt nghiệp, poster cử nhân):
            // Cho chiều cao đạt tối đa, và chiều rộng co lại theo đúng tỷ lệ của ảnh để viền bọc khít ảnh!
            targetH = maxH;
            targetW = Math.round(targetH * ratio);

            // Nếu chiều rộng vẫn vượt quá chiều rộng cho phép thì giới hạn lại
            if (targetW > maxW) {
                targetW = maxW;
                targetH = Math.round(targetW / ratio);
            }
        } else {
            // ẢNH NẰM NGANG HOẶC VUÔNG:
            targetW = maxW;
            targetH = Math.round(targetW / ratio);

            if (targetH > maxH) {
                targetH = maxH;
                targetW = Math.round(targetH * ratio);
            }
            if (targetH < 180) {
                targetH = 180;
            }
        }

        // Đặt kích thước khung bọc khít chính xác 100% theo tỷ lệ ảnh
        frameEl.style.width = `${targetW}px`;
        frameEl.style.height = `${targetH}px`;
        frameEl.style.maxWidth = '100%';
        frameEl.style.margin = '0 auto';
        frameEl.style.aspectRatio = `${naturalW} / ${naturalH}`;
        frameEl.classList.add('has-photo');

        // Gán ảnh và LẮP KÍN 100% TOÀN BỘ KHUNG
        imgEl.src = imageSrc;
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgEl.classList.remove('hidden');

        // Ẩn đồ họa mặc định
        if (defaultGraphic) {
            defaultGraphic.classList.add('hidden');
        }

        // Ẩn lớp hào quang thừa vì ảnh đã lấp kín 100% khung
        if (ambientEl) {
            ambientEl.classList.add('hidden');
        }

        // Hiện nút gỡ ảnh
        if (toolsEl) {
            toolsEl.classList.remove('hidden');
        }

        // Cập nhật nút bấm tải ảnh thành nút nổi nhỏ gọn
        if (btnText) {
            btnText.innerText = 'Đổi ảnh khác';
        }

        // Lưu vào localStorage
        if (shouldSave) {
            try {
                localStorage.setItem(PHOTO_STORAGE_KEYS[slot].src, imageSrc);
                localStorage.setItem(PHOTO_STORAGE_KEYS[slot].ratio, ratio.toFixed(3));
            } catch (err) {
                console.warn('Không thể lưu ảnh vào localStorage:', err);
            }
        }

        if (window.lucide) lucide.createIcons();
    };

    tempImg.src = imageSrc;
}

// Xử lý khi người dùng chọn tải ảnh lên Slide 1 (Ảnh tốt nghiệp)
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    processAndOptimizeImage(file, (optimizedDataUrl) => {
        applySmartPhotoLayout('s1', optimizedDataUrl, 'cover', true);
        if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 80 });
        if (typeof showEditToast === 'function') {
            showEditToast('✨ Đã căn chỉnh khung ôm khít và lấp đầy bức ảnh của bạn!');
        }
    });
}

// Xử lý khi người dùng chọn tải ảnh lên Slide 4 (Ảnh kỷ niệm)
function handlePhotoUpload2(event) {
    const file = event.target.files[0];
    if (!file) return;

    processAndOptimizeImage(file, (optimizedDataUrl) => {
        applySmartPhotoLayout('s4', optimizedDataUrl, 'cover', true);
        if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 80 });
        if (typeof showEditToast === 'function') {
            showEditToast('✨ Đã căn chỉnh khung ôm khít và lấp đầy bức ảnh của bạn!');
        }
    });
}

// Đặt lại ảnh mặc định (Xóa ảnh tùy chỉnh)
function resetUserPhoto(slot) {
    const isS1 = slot === 's1';
    const frameEl = document.getElementById(isS1 ? 'photo-frame-s1' : 'photo-frame-s4');
    const imgEl = document.getElementById(isS1 ? 'uploaded-img' : 'uploaded-img-2');
    const ambientEl = document.getElementById(isS1 ? 'uploaded-img-ambient' : 'uploaded-img-2-ambient');
    const defaultGraphic = document.getElementById(isS1 ? 'default-photo-graphic' : 'default-photo-graphic-2');
    const toolsEl = document.getElementById(isS1 ? 'photo-tools-s1' : 'photo-tools-s4');
    const btnText = document.getElementById(isS1 ? 'upload-btn-text' : 'upload-btn-text-2');

    if (imgEl) {
        imgEl.src = '';
        imgEl.classList.add('hidden');
    }
    if (ambientEl) {
        ambientEl.classList.add('hidden');
    }
    if (defaultGraphic) {
        defaultGraphic.classList.remove('hidden');
    }
    if (toolsEl) {
        toolsEl.classList.add('hidden');
    }
    if (frameEl) {
        frameEl.style.width = '';
        frameEl.style.height = '';
        frameEl.style.maxWidth = '';
        frameEl.style.margin = '';
        frameEl.style.aspectRatio = '';
        frameEl.classList.remove('has-photo');
    }
    if (btnText) {
        btnText.innerText = isS1 ? '📸 Ghép ảnh tốt nghiệp của bạn' : '📸 Ghép ảnh kỷ niệm';
    }

    localStorage.removeItem(PHOTO_STORAGE_KEYS[slot].src);
    localStorage.removeItem(PHOTO_STORAGE_KEYS[slot].ratio);
    localStorage.removeItem(PHOTO_STORAGE_KEYS[slot].fit);

    if (typeof showEditToast === 'function') {
        showEditToast('🔄 Đã khôi phục hình ảnh mặc định!');
    }
}

// Hàm tối ưu hóa và nén nhẹ ảnh bằng Canvas để web mượt mà và lưu được trong trình duyệt
function processAndOptimizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDimension = 1280;
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;

            if (w > maxDimension || h > maxDimension) {
                if (w > h) {
                    h = Math.round((h * maxDimension) / w);
                    w = maxDimension;
                } else {
                    w = Math.round((w * maxDimension) / h);
                    h = maxDimension;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            // Xuất file ảnh JPEG chất lượng cao 88%
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Tự động khôi phục ảnh đã lưu khi mở lại trang web
function restoreSavedUserPhotos() {
    ['s1', 's4'].forEach(slot => {
        const savedSrc = localStorage.getItem(PHOTO_STORAGE_KEYS[slot].src);
        if (savedSrc) {
            applySmartPhotoLayout(slot, savedSrc, 'cover', false);
        }
    });
}

// ==========================================
// 4. RSVP MODAL (CHẤP NHẬN & TỪ CHỐI KHÉO LÉO)
// ==========================================
function openModal() {
    const modal = document.getElementById('rsvp-modal');
    const content = document.getElementById('modal-content');
    if (modal && content) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-90');
        content.classList.add('scale-100');
    }
}

function closeModal() {
    const modal = document.getElementById('rsvp-modal');
    const content = document.getElementById('modal-content');
    if (modal && content) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-100');
        content.classList.add('scale-90');
    }
}

// Khi khách bấm "Đi chứ, chắc chắn tới quẩy cùng bạn!"
function triggerRSVPAccept() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
    }
    const iconEl = document.getElementById('rsvp-modal-icon');
    const titleEl = document.getElementById('rsvp-modal-title');
    const descEl = document.getElementById('rsvp-modal-desc');
    const btnEl = document.getElementById('rsvp-modal-btn');
    const modalContent = document.getElementById('modal-content');

    if (modalContent) {
        modalContent.className = 'bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border-4 border-amber-400 transform scale-100 transition-transform duration-300 relative overflow-hidden';
    }
    if (iconEl) iconEl.innerText = '🥳';
    if (titleEl) {
        titleEl.className = 'font-black text-xl text-ueh-blue';
        titleEl.innerText = 'HẸN GẶP BẠN NHA! SIÊU VUI LUÔN! 🎉';
    }
    if (descEl) {
        const timeStr = (document.querySelector('[data-key="s3-time"]') || {}).innerText || '9:30 - Sáng';
        descEl.innerHTML = `Cảm ơn bạn yêu dấu! Tớ đã ghi nhớ bạn trong danh sách thượng khách lúc <strong class="text-ueh-blue">${timeStr} ngày 26/09/2026</strong> tại <strong class="text-ueh-blue">UEH Cơ sở A</strong> rồi nha. Chuẩn bị tinh thần chụp 1000 tấm hình kỷ niệm nhé! 🥰`;
    }
    if (btnEl) {
        btnEl.className = 'w-full bg-ueh-blue text-white font-black py-3 rounded-xl shadow-lg hover:bg-blue-900 transition text-xs border border-yellow-300 cursor-pointer';
        btnEl.innerText = 'Hẹn gặp bạn nha! ❤️';
    }

    openModal();
}

// Khi khách bấm "Tiếc quá hôm đó bận rùi, xin lũi bạn nha!"
function triggerRSVPDecline() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.5 }
        });
    }
    const iconEl = document.getElementById('rsvp-modal-icon');
    const titleEl = document.getElementById('rsvp-modal-title');
    const descEl = document.getElementById('rsvp-modal-desc');
    const btnEl = document.getElementById('rsvp-modal-btn');
    const modalContent = document.getElementById('modal-content');

    if (modalContent) {
        modalContent.className = 'bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border-4 border-pink-400 transform scale-100 transition-transform duration-300 relative overflow-hidden';
    }
    if (iconEl) iconEl.innerText = '🥺❤️';
    if (titleEl) {
        titleEl.className = 'font-black text-xl text-pink-600';
        titleEl.innerText = 'KHÔNG SAO NÈ, ĐỪNG ÁY NÁY NHA!';
    }
    if (descEl) {
        descEl.innerHTML = 'Tớ biết bạn luôn yêu quý và chúc phúc cho tớ mà! Dù hôm đó bạn bận không đến được nhưng nhận được lời nhắn nhủ dễ thương này là tớ đã thấy ấm áp và hạnh phúc 100% rồi. Hẹn dịp khác chúng mình bù một bữa trà sữa xôm tụ nhé! 🥰';
    }
    if (btnEl) {
        btnEl.className = 'w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black py-3 rounded-xl shadow-lg hover:from-pink-600 hover:to-rose-600 transition text-xs border border-pink-300 cursor-pointer';
        btnEl.innerText = 'Mãi là bạn tốt nha! 💖';
    }

    openModal();
}

function triggerRSVP() {
    triggerRSVPAccept();
}

// ==========================================
// 5. DRAGGABLE & EDITABLE STICKER SYSTEM
// ==========================================

function toggleStickerEditMode() {
    stickerEditMode = !stickerEditMode;
    const btn = document.getElementById('toggle-sticker-mode-btn');
    const toolbar = document.getElementById('sticker-edit-toolbar');
    const tip = document.getElementById('sticker-edit-tip');
    const stickers = document.querySelectorAll('.draggable-sticker');

    if (stickerEditMode) {
        if (btn) {
            btn.classList.add('bg-amber-400', 'text-slate-900', 'border-amber-500');
            btn.classList.remove('bg-white/95', 'text-slate-800');
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> <span>Xong (Đang bật Chế độ Chỉnh Sửa Sticker)</span>';
        }
        if (toolbar) toolbar.classList.remove('hidden');
        if (tip) tip.classList.remove('hidden');
        stickers.forEach(s => s.classList.add('drag-active'));
    } else {
        if (btn) {
            btn.classList.remove('bg-amber-400', 'text-slate-900', 'border-amber-500');
            btn.classList.add('bg-white/95', 'text-slate-800');
            btn.innerHTML = '<i data-lucide="move" class="w-3.5 h-3.5 text-amber-600"></i> <span>🎨 Kéo Thả & Sửa Chữ Sticker (Năm 1, 2, 3)</span>';
        }
        if (toolbar) toolbar.classList.add('hidden');
        if (tip) tip.classList.add('hidden');
        stickers.forEach(s => s.classList.remove('drag-active'));
        saveStickersToStorage();
    }
    if (window.lucide) lucide.createIcons();
}

function initStickerDraggable(el) {
    el.addEventListener('mousedown', function(e) {
        if (!editMode) return;
        startDrag.call(this, e);
    });
    el.addEventListener('touchstart', function(e) {
        if (!editMode) return;
        startDrag.call(this, e);
    }, { passive: false });

    el.addEventListener('dblclick', function(e) {
        if (!editMode) return;
        e.stopPropagation();
        e.preventDefault();
        const currentText = el.innerText.trim();
        const newText = prompt('✏️ Nhập nội dung mới cho sticker / lời thoại:', currentText);
        if (newText !== null && newText.trim() !== '') {
            el.innerText = newText.trim();
            saveStickersToStorage();
        }
    });
}

function startDrag(e) {
    if (!editMode) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    draggedSticker = this;
    draggedSticker.classList.add('dragging');

    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    const rect = draggedSticker.getBoundingClientRect();

    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

function onDrag(e) {
    if (!draggedSticker || !editMode) return;
    if (e.cancelable) e.preventDefault();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);

    const container = draggedSticker.closest('.cartoon-scene') || draggedSticker.parentElement || document.getElementById('video-screen-container');
    if (!container) return;
    const contRect = container.getBoundingClientRect();

    let left = clientX - contRect.left - dragOffsetX;
    let top = clientY - contRect.top - dragOffsetY;

    left = Math.max(2, Math.min(left, contRect.width - draggedSticker.offsetWidth - 2));
    top = Math.max(2, Math.min(top, contRect.height - draggedSticker.offsetHeight - 2));

    draggedSticker.style.left = `${left}px`;
    draggedSticker.style.top = `${top}px`;
    draggedSticker.style.bottom = 'auto';
    draggedSticker.style.right = 'auto';
}

function stopDrag() {
    if (draggedSticker) {
        draggedSticker.classList.remove('dragging');
        draggedSticker = null;
        saveStickersToStorage();
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', stopDrag);
}

function addNewSticker() {
    const defaultTexts = [
        '🧋 TRÀ SỮA CỨU RỖI',
        '💤 BUỒN NGỦ QUÁ',
        '⚡ CHẠY DEADLINE',
        '😱 CỨU VỚI',
        '🎯 QUYẾT TÂM HỌC BỔNG',
        '☕ THÊM CÀ PHÊ ĐI'
    ];
    const text = prompt('Nhập nội dung sticker mới:', defaultTexts[Math.floor(Math.random() * defaultTexts.length)]);
    if (!text || text.trim() === '') return;

    const colors = [
        'bg-yellow-400 text-slate-900 border-2 border-white',
        'bg-rose-500 text-white border-2 border-white',
        'bg-sky-500 text-white border-2 border-white',
        'bg-purple-600 text-white border-2 border-white',
        'bg-emerald-500 text-slate-950 border-2 border-white'
    ];
    const randColor = colors[Math.floor(Math.random() * colors.length)];

    // Thêm vào cảnh năm hiện tại
    const container = document.getElementById(`scene-year-${currentYearIndex}`) || document.getElementById('video-screen-container');
    if (!container) return;

    const newEl = document.createElement('div');
    newEl.id = `custom-sticker-${Date.now()}`;
    newEl.className = `draggable-sticker sticker-badge ${randColor} font-black text-[9px] px-2.5 py-1 rounded-xl shadow-lg drag-active`;
    newEl.style.left = '40px';
    newEl.style.top = '40px';
    newEl.innerText = text.trim();
    newEl.title = 'Kéo thả hoặc nhấp đúp để đổi chữ!';

    initStickerDraggable(newEl);
    container.appendChild(newEl);
    saveStickersToStorage();
}

function resetStickers() {
    localStorage.removeItem('thiep_year_stickers_v3');
    localStorage.removeItem('thiep_saved_stickers_v2');
    localStorage.removeItem('thiep_saved_stickers');
    location.reload();
}

function saveStickersToStorage() {
    const stickers = document.querySelectorAll('.cartoon-scene .draggable-sticker');
    const data = {};
    stickers.forEach(s => {
        if (s.id) {
            data[s.id] = {
                text: s.innerText.trim(),
                left: s.style.left,
                top: s.style.top,
                right: s.style.right,
                bottom: s.style.bottom,
                className: s.className.replace('drag-active', '').replace('dragging', '').trim()
            };
        }
    });
    localStorage.setItem('thiep_year_stickers_v3', JSON.stringify(data));
    if (typeof debouncedSyncToCloud === 'function') {
        debouncedSyncToCloud();
    }
}

function loadSavedStickers() {
    const saved = localStorage.getItem('thiep_year_stickers_v3');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.keys(data).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (data[id].text) el.innerText = data[id].text;
                    if (data[id].left) el.style.left = data[id].left;
                    if (data[id].top) el.style.top = data[id].top;
                    if (data[id].right) el.style.right = data[id].right;
                    if (data[id].bottom) el.style.bottom = data[id].bottom;
                }
            });
        } catch(e) {
            console.error('Lỗi khi tải sticker đã lưu:', e);
        }
    }

    const allStickers = document.querySelectorAll('.draggable-sticker');
    allStickers.forEach(s => initStickerDraggable(s));
}

// ==========================================
// 5B. 📦 UNIVERSAL DRAGGABLE BOX & FRAME SYSTEM
// ==========================================
const BOX_POSITIONS_KEY = 'thiep_box_positions_v1';
let draggedBox = null;
let boxStartPointerX = 0;
let boxStartPointerY = 0;
let boxInitialTranslateX = 0;
let boxInitialTranslateY = 0;
let isBoxDraggingMoved = false;

function parseTranslate(transformStr) {
    if (!transformStr || transformStr === 'none') return { x: 0, y: 0 };
    const match = transformStr.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/i);
    if (match) {
        return { x: parseFloat(match[1]) || 0, y: parseFloat(match[2]) || 0 };
    }
    return { x: 0, y: 0 };
}

function handleBoxMouseDown(e) {
    if (!editMode) return;
    if (e.target.closest('input, button, textarea, a, .edit-delete-btn')) return;
    if (this.classList.contains('draggable-sticker') && this.closest('.cartoon-scene')) return;
    e.stopPropagation();
    startBoxDrag(this, e.clientX, e.clientY, e);
}

function handleBoxTouchStart(e) {
    if (!editMode) return;
    if (e.target.closest('input, button, textarea, a, .edit-delete-btn')) return;
    if (this.classList.contains('draggable-sticker') && this.closest('.cartoon-scene')) return;
    if (e.touches && e.touches[0]) {
        e.stopPropagation();
        startBoxDrag(this, e.touches[0].clientX, e.touches[0].clientY, e);
    }
}

function startBoxDrag(box, clientX, clientY, e) {
    if (e.cancelable) e.preventDefault();
    draggedBox = box;
    isBoxDraggingMoved = false;
    boxStartPointerX = clientX;
    boxStartPointerY = clientY;

    const current = parseTranslate(box.style.transform);
    boxInitialTranslateX = current.x;
    boxInitialTranslateY = current.y;

    box.classList.add('box-dragging');

    document.addEventListener('mousemove', onBoxDragMove);
    document.addEventListener('mouseup', stopBoxDrag);
    document.addEventListener('touchmove', onBoxDragTouch, { passive: false });
    document.addEventListener('touchend', stopBoxDrag);
    document.addEventListener('touchcancel', stopBoxDrag);
}

function onBoxDragMove(e) {
    if (!draggedBox) return;
    updateBoxDragPosition(e.clientX, e.clientY, e);
}

function onBoxDragTouch(e) {
    if (!draggedBox) return;
    if (e.touches && e.touches[0]) {
        updateBoxDragPosition(e.touches[0].clientX, e.touches[0].clientY, e);
    }
}

function updateBoxDragPosition(clientX, clientY, e) {
    if (!draggedBox) return;
    if (e && e.cancelable) e.preventDefault();

    const deltaX = clientX - boxStartPointerX;
    const deltaY = clientY - boxStartPointerY;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        isBoxDraggingMoved = true;
    }

    const newX = Math.round(boxInitialTranslateX + deltaX);
    const newY = Math.round(boxInitialTranslateY + deltaY);

    draggedBox.style.transform = `translate(${newX}px, ${newY}px)`;
}

function stopBoxDrag() {
    if (draggedBox) {
        draggedBox.classList.remove('box-dragging');
        if (isBoxDraggingMoved) {
            saveAllBoxPositions();
        }
        draggedBox = null;
    }

    document.removeEventListener('mousemove', onBoxDragMove);
    document.removeEventListener('mouseup', stopBoxDrag);
    document.removeEventListener('touchmove', onBoxDragTouch);
    document.removeEventListener('touchend', stopBoxDrag);
    document.removeEventListener('touchcancel', stopBoxDrag);
}

function initDraggableBoxes() {
    const boxes = document.querySelectorAll('.draggable-box');
    boxes.forEach(box => {
        box.style.touchAction = 'none';
        box.removeEventListener('mousedown', handleBoxMouseDown);
        box.removeEventListener('touchstart', handleBoxTouchStart);

        box.addEventListener('mousedown', handleBoxMouseDown);
        box.addEventListener('touchstart', handleBoxTouchStart, { passive: false });
    });

    loadSavedBoxPositions();
}

function saveAllBoxPositions() {
    const boxes = document.querySelectorAll('.draggable-box[id]');
    const data = {};
    boxes.forEach(box => {
        const trans = parseTranslate(box.style.transform);
        if (trans.x !== 0 || trans.y !== 0) {
            data[box.id] = trans;
        }
    });
    localStorage.setItem(BOX_POSITIONS_KEY, JSON.stringify(data));
    if (typeof debouncedSyncToCloud === 'function') {
        debouncedSyncToCloud();
    }
}

function loadSavedBoxPositions() {
    try {
        const saved = localStorage.getItem(BOX_POSITIONS_KEY);
        if (!saved) return;
        const data = JSON.parse(saved);
        Object.keys(data).forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id]) {
                el.style.transform = `translate(${data[id].x}px, ${data[id].y}px)`;
            }
        });
    } catch(e) {
        console.error('Lỗi khi tải vị trí khung chữ:', e);
    }
}

// ==========================================
// 6. ✏️ UNIVERSAL EDITABLE TEXT SYSTEM
// ==========================================

// Store original text for reset
const originalTexts = {};

function toggleEditMode() {
    editMode = !editMode;
    stickerEditMode = editMode;
    const card = document.getElementById('card-container');
    const editBtn = document.getElementById('btn-edit-mode');
    const indicator = document.getElementById('edit-mode-indicator');
    const stickers = document.querySelectorAll('.draggable-sticker');

    if (!card) return;

    if (editMode) {
        card.classList.add('edit-mode');
        document.body.classList.remove('is-guest');
        if (editBtn) {
            editBtn.classList.add('bg-amber-400', 'text-slate-900');
            editBtn.classList.remove('bg-slate-100', 'text-slate-800');
            editBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
        }
        if (indicator) {
            indicator.classList.remove('hidden');
            indicator.innerHTML = '<span>✏️ CHẾ ĐỘ SỬA: KÉO THẢ TỰ DO MỌI KHUNG CHỮ & NHẤP ĐÚP ĐỂ ĐỔI CHỮ</span>';
        }
        stickers.forEach(s => s.classList.add('drag-active'));
        showEditToast('✏️ Đã bật Chế độ Sửa: Bạn có thể KÉO THẢ tự do mọi khung chữ / sticker và nhấp đúp để đổi chữ!');
    } else {
        card.classList.remove('edit-mode');
        if (editBtn) {
            editBtn.classList.remove('bg-amber-400', 'text-slate-900');
            editBtn.classList.add('bg-slate-100', 'text-slate-800');
            editBtn.innerHTML = '<i data-lucide="pencil" class="w-4 h-4 text-amber-600"></i>';
        }
        if (indicator) indicator.classList.add('hidden');
        stickers.forEach(s => s.classList.remove('drag-active'));
        saveAllEdits();
        saveStickersToStorage();
        saveAllBoxPositions();
        showEditToast('☁️ Đã lưu & đồng bộ lên Google Sheet!');
        if (typeof syncConfigToCloud === 'function') {
            syncConfigToCloud(false);
        }
    }
    if (window.lucide) lucide.createIcons();
}

function getDeletedObjects() {
    try {
        const saved = localStorage.getItem(DELETED_OBJECTS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch(e) {
        return [];
    }
}

function saveDeletedObject(key) {
    const list = getDeletedObjects();
    if (!list.includes(key)) {
        list.push(key);
        localStorage.setItem(DELETED_OBJECTS_KEY, JSON.stringify(list));
    }
    if (typeof debouncedSyncToCloud === 'function') {
        debouncedSyncToCloud();
    }
}

function showEditToast(msg) {
    let toast = document.getElementById('edit-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'edit-toast';
        toast.className = 'fixed top-12 left-1/2 transform -translate-x-1/2 bg-slate-900/95 text-white font-black text-xs py-2 px-4 rounded-full border-2 border-amber-400 shadow-2xl z-[99999] transition-all pointer-events-none duration-300';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -12px)';
    }, 2400);
}

function deleteEditableObject(el) {
    const key = el.getAttribute('data-key');
    el.classList.add('object-deleted');
    if (key) {
        saveDeletedObject(key);
    }
    showEditToast('🗑️ Đã xóa đối tượng! (Bấm nút 🔄 bên dưới để khôi phục)');
}

function initEditableTexts() {
    const editables = document.querySelectorAll('.editable-text');

    editables.forEach(el => {
        const key = el.getAttribute('data-key');
        if (key) {
            originalTexts[key] = el.innerHTML;
        }

        // Tạo nút xóa [✕] đỏ nổi bật nếu chưa có
        if (!el.querySelector('.edit-delete-btn')) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'edit-delete-btn';
            delBtn.title = 'Bấm để XÓA BỎ đối tượng/nội dung này';
            delBtn.innerHTML = '✕';
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                deleteEditableObject(el);
            });
            el.appendChild(delBtn);
        }

        // Double-click to edit text or delete
        el.addEventListener('dblclick', function(e) {
            if (!editMode) return;
            if (e.target.closest('.edit-delete-btn')) return;
            e.stopPropagation();
            e.preventDefault();

            // Lấy text hiện tại (loại bỏ nút xóa)
            const clone = el.cloneNode(true);
            const btnInClone = clone.querySelector('.edit-delete-btn');
            if (btnInClone) btnInClone.remove();
            const currentText = clone.innerText.trim();

            const newText = prompt('✏️ Nhập nội dung mới:\n\n(Để trống hoặc gõ "xóa" để XÓA BỎ đối tượng này)', currentText);

            if (newText !== null) {
                const cleaned = newText.trim();
                if (cleaned === '' || cleaned.toLowerCase() === 'xóa' || cleaned.toLowerCase() === 'xoa' || cleaned.toLowerCase() === 'delete') {
                    deleteEditableObject(el);
                } else {
                    const delBtn = el.querySelector('.edit-delete-btn');
                    el.innerText = cleaned;
                    if (delBtn) el.appendChild(delBtn);
                    el.classList.add('editing');
                    setTimeout(() => el.classList.remove('editing'), 1500);
                    saveAllEdits();
                }
            }
        });

        // Single click shows visual feedback
        el.addEventListener('click', function(e) {
            if (!editMode) return;
            if (e.target.closest('.edit-delete-btn')) return;
            e.stopPropagation();
            el.classList.add('editing');
            setTimeout(() => el.classList.remove('editing'), 800);
        });
    });
}

function saveAllEdits() {
    const editables = document.querySelectorAll('.editable-text[data-key]');
    const data = {};

    editables.forEach(el => {
        const key = el.getAttribute('data-key');
        if (key && !el.classList.contains('object-deleted')) {
            const clone = el.cloneNode(true);
            const btnInClone = clone.querySelector('.edit-delete-btn');
            if (btnInClone) btnInClone.remove();
            if (clone.innerText.trim() !== '') {
                data[key] = clone.innerText.trim();
            }
        }
    });

    localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(data));
    if (typeof debouncedSyncToCloud === 'function') {
        debouncedSyncToCloud();
    }
}

function loadSavedEdits() {
    // 1. Tải và ẩn các đối tượng đã bị người dùng xóa
    const deletedList = getDeletedObjects();
    deletedList.forEach(key => {
        const el = document.querySelector(`.editable-text[data-key="${key}"]`);
        if (el) {
            el.classList.add('object-deleted');
        }
    });

    // 2. Tải lại nội dung chữ đã sửa
    const saved = localStorage.getItem(EDIT_STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
            const el = document.querySelector(`.editable-text[data-key="${key}"]`);
            if (el && data[key] && !el.classList.contains('object-deleted')) {
                const delBtn = el.querySelector('.edit-delete-btn');
                el.innerText = data[key];
                if (delBtn) el.appendChild(delBtn);
            }
        });
    } catch(e) {
        console.error('Lỗi khi tải nội dung đã lưu:', e);
    }
}

function resetAllEdits() {
    if (!confirm('🔄 Bạn có chắc muốn khôi phục toàn bộ nội dung về mặc định?\n\n(Mọi chỉnh sửa chữ, vị trí kéo thả và các đối tượng đã bị xóa sẽ được khôi phục lại đầy đủ!)')) return;

    localStorage.removeItem(EDIT_STORAGE_KEY);
    localStorage.removeItem(DELETED_OBJECTS_KEY);
    localStorage.removeItem(BOX_POSITIONS_KEY);
    localStorage.removeItem('thiep_saved_stickers');
    localStorage.removeItem('thiep_saved_stickers_v2');
    localStorage.removeItem('thiep_year_stickers_v3');
    location.reload();
}

// ==========================================
// 7. SPARKLE PARTICLES GENERATOR
// ==========================================
function generateSparkles() {
    const layer = document.getElementById('sparkle-layer');
    if (!layer) return;

    const sparkleEmojis = ['✨', '⭐', '🌟', '💫', '🫧', '🌸', '💎', '🔮'];
    for (let i = 0; i < 8; i++) {
        const spark = document.createElement('span');
        spark.className = 'sparkle';
        spark.innerText = sparkleEmojis[i % sparkleEmojis.length];
        layer.appendChild(spark);
    }
}

function generateBubbles() {
    const layer = document.getElementById('bubble-layer');
    if (!layer) return;

    for (let i = 0; i < 5; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        layer.appendChild(bubble);
    }
}

// ==========================================
// 7B. 🌐 TỰ ĐỘNG ĐÓNG GÓI & ĐỒNG BỘ CHỈNH SỬA CHO KHÁCH (URL AUTO-SYNC)
// ==========================================
function packEditsForUrl() {
    try {
        const texts = JSON.parse(localStorage.getItem(EDIT_STORAGE_KEY) || '{}');
        const dels = JSON.parse(localStorage.getItem(DELETED_OBJECTS_KEY) || '[]');
        const boxes = JSON.parse(localStorage.getItem(BOX_POSITIONS_KEY) || '{}');
        const stickers = JSON.parse(localStorage.getItem('thiep_year_stickers_v3') || '{}');

        if (Object.keys(texts).length === 0 && dels.length === 0 && Object.keys(boxes).length === 0 && Object.keys(stickers).length === 0) {
            return '';
        }

        const payload = { t: texts, d: dels, b: boxes, s: stickers };
        const jsonStr = JSON.stringify(payload);
        return encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    } catch(e) {
        return '';
    }
}

function unpackEditsFromUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const raw = urlParams.get('c') || urlParams.get('d') || urlParams.get('edits');
        if (!raw) return;
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
        const data = JSON.parse(jsonStr);
        if (data.t && typeof data.t === 'object') {
            const current = JSON.parse(localStorage.getItem(EDIT_STORAGE_KEY) || '{}');
            localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(Object.assign({}, current, data.t)));
        }
        if (Array.isArray(data.d)) {
            const current = JSON.parse(localStorage.getItem(DELETED_OBJECTS_KEY) || '[]');
            const merged = Array.from(new Set([...current, ...data.d]));
            localStorage.setItem(DELETED_OBJECTS_KEY, JSON.stringify(merged));
        }
        if (data.b && typeof data.b === 'object') {
            const current = JSON.parse(localStorage.getItem(BOX_POSITIONS_KEY) || '{}');
            localStorage.setItem(BOX_POSITIONS_KEY, JSON.stringify(Object.assign({}, current, data.b)));
        }
        if (data.s && typeof data.s === 'object') {
            const current = JSON.parse(localStorage.getItem('thiep_year_stickers_v3') || '{}');
            localStorage.setItem('thiep_year_stickers_v3', JSON.stringify(Object.assign({}, current, data.s)));
        }
    } catch(e) {
        console.warn('Không thể nạp cấu hình từ link:', e);
    }
}

// ==============================================================================
// 7C. ☁️ ĐỒNG BỘ REAL-TIME ĐÁM MÂY QUA GOOGLE SHEET (KHÔNG CẦN CHẠM VÀO CODE)
// ==============================================================================
let cloudSyncTimer = null;

function debouncedSyncToCloud() {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        syncConfigToCloud(true);
    }, 1000);
}

async function syncConfigToCloud(silent = false) {
    const sheetUrl = getGoogleSheetUrl();
    if (!sheetUrl) return;

    const texts = JSON.parse(localStorage.getItem(EDIT_STORAGE_KEY) || '{}');
    const dels = JSON.parse(localStorage.getItem(DELETED_OBJECTS_KEY) || '[]');
    const boxes = JSON.parse(localStorage.getItem(BOX_POSITIONS_KEY) || '{}');
    const stickers = JSON.parse(localStorage.getItem('thiep_year_stickers_v3') || '{}');

    const payload = {
        action: 'save_config',
        config: { t: texts, d: dels, b: boxes, s: stickers },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(sheetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        if (!silent && typeof showEditToast === 'function') {
            showEditToast('☁️ Đã đồng bộ 100% lên Google Sheet!');
        }
    } catch (err) {
        console.warn('Lỗi đồng bộ đám mây:', err);
    }
}

async function loadConfigFromCloud() {
    const sheetUrl = getGoogleSheetUrl();
    if (!sheetUrl) return;

    function applyConfig(data) {
        if (!data || typeof data !== 'object') return;
        let changed = false;
        if (data.t && Object.keys(data.t).length > 0) {
            localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(data.t));
            changed = true;
        }
        if (Array.isArray(data.d) && data.d.length > 0) {
            localStorage.setItem(DELETED_OBJECTS_KEY, JSON.stringify(data.d));
            changed = true;
        }
        if (data.b && Object.keys(data.b).length > 0) {
            localStorage.setItem(BOX_POSITIONS_KEY, JSON.stringify(data.b));
            changed = true;
        }
        if (data.s && Object.keys(data.s).length > 0) {
            localStorage.setItem('thiep_year_stickers_v3', JSON.stringify(data.s));
            changed = true;
        }
        if (changed) {
            loadSavedEdits();
            loadSavedStickers();
            loadSavedBoxPositions();
            if (window.lucide) lucide.createIcons();
        }
    }

    // 1. Thử tải nhanh qua fetch thông thường
    try {
        const sep = sheetUrl.includes('?') ? '&' : '?';
        const resp = await fetch(`${sheetUrl}${sep}action=get_config&t=${Date.now()}`);
        if (resp.ok) {
            const result = await resp.json();
            if (result && result.status === 'success' && result.data) {
                applyConfig(result.data);
                return;
            }
        }
    } catch(e) {
        console.warn('Fetch config đám mây thất bại, đang chuyển sang JSONP fallback:', e);
    }

    // 2. JSONP Fallback (Đảm bảo 100% chạy xuyên qua mọi trình duyệt di động Zalo / Messenger / Safari)
    try {
        const callbackName = 'onCloudConfigLoaded_' + Math.floor(Math.random() * 1000000);
        window[callbackName] = function(result) {
            delete window[callbackName];
            const scriptTag = document.getElementById(callbackName);
            if (scriptTag) scriptTag.remove();
            if (result && result.status === 'success' && result.data) {
                applyConfig(result.data);
            }
        };
        const sep = sheetUrl.includes('?') ? '&' : '?';
        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `${sheetUrl}${sep}action=get_config&callback=${callbackName}&t=${Date.now()}`;
        document.head.appendChild(script);
    } catch(err) {
        console.warn('Lỗi JSONP tải cấu hình đám mây:', err);
    }
}

// Xuất file index.html với toàn bộ chỉnh sửa được nhúng cứng vĩnh viễn
function exportUpdatedHtml() {
    const cloneDoc = document.documentElement.cloneNode(true);
    cloneDoc.querySelectorAll('.edit-delete-btn').forEach(btn => btn.remove());
    const card = cloneDoc.querySelector('#card-container');
    if (card) card.classList.remove('edit-mode');
    cloneDoc.querySelectorAll('.drag-active, .dragging, .box-dragging').forEach(el => {
        el.classList.remove('drag-active', 'dragging', 'box-dragging');
    });

    const dels = JSON.parse(localStorage.getItem(DELETED_OBJECTS_KEY) || '[]');
    dels.forEach(key => {
        const el = cloneDoc.querySelector(`[data-key="${key}"]`);
        if (el) {
            const parentBox = el.closest('.draggable-box') || el;
            parentBox.classList.add('hidden', 'object-deleted');
        }
    });

    const texts = JSON.parse(localStorage.getItem(EDIT_STORAGE_KEY) || '{}');
    Object.keys(texts).forEach(key => {
        const el = cloneDoc.querySelector(`[data-key="${key}"]`);
        if (el) el.innerText = texts[key];
    });

    const boxes = JSON.parse(localStorage.getItem(BOX_POSITIONS_KEY) || '{}');
    Object.keys(boxes).forEach(id => {
        const el = cloneDoc.querySelector(`#${id}`);
        if (el && boxes[id]) {
            el.style.transform = `translate(${boxes[id].x}px, ${boxes[id].y}px)`;
        }
    });

    const stickers = JSON.parse(localStorage.getItem('thiep_year_stickers_v3') || '{}');
    Object.keys(stickers).forEach(id => {
        const el = cloneDoc.querySelector(`#${id}`);
        if (el && stickers[id]) {
            if (stickers[id].text) el.innerText = stickers[id].text;
            if (stickers[id].left) el.style.left = stickers[id].left;
            if (stickers[id].top) el.style.top = stickers[id].top;
            if (stickers[id].right) el.style.right = stickers[id].right;
            if (stickers[id].bottom) el.style.bottom = stickers[id].bottom;
        }
    });

    const fullHtml = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
    }, 1500);

    alert('🎉 Đã tải file "index.html" mới với toàn bộ các chỉnh sửa của bạn được lưu vĩnh viễn!\n\nBạn có thể thay thế file index.html cũ trong thư mục rồi đẩy lên Netlify / GitHub nếu muốn.');
}

// ==========================================
// 8. INITIALIZATION
// ==========================================
function initCard() {
    // 0. Tự động giải nén cấu hình chỉnh sửa từ URL nếu được gửi qua link
    unpackEditsFromUrl();

    // 0B. Tự động đồng bộ cấu hình mới nhất từ đám mây Google Sheet
    loadConfigFromCloud();

    if (window.lucide) {
        lucide.createIcons();
    }

    // Generate visual effects
    generateSparkles();
    generateBubbles();

    // Load saved data & stickers
    loadSavedStickers();
    loadSavedEdits();

    // Init universal draggable boxes across all slides
    initDraggableBoxes();

    // Init editable texts
    initEditableTexts();

    // Init cartoon video player on slide 0
    if (typeof setYearScene === 'function') {
        setYearScene(0);
        restartVideoTimer();
    }

    // Start slide
    updateSlide();

    // Init RSVP system & check URL parameters
    initRSVPModule();

    // Init Background Music System
    initMusicSystem();
}

// ==========================================
// 9. CARTOON VIDEO THEATER CONTROLLER
// ==========================================

const defaultYearStory = [
    {
        subtitle: '✨ "Em nhất định sẽ rinh học bổng và tốt nghiệp Thủ khoa!" ✨',
        mood: '🌸 Trạng thái: Tràn trề hy vọng & mộng mơ',
        life: '❤️ SINH LỰC: 100%'
    },
    {
        subtitle: '⚡ "Deadline nộp bài nhóm 5 phút nữa, sao chưa ai làm xong?!" ⚡',
        mood: '🏃‍♀️ Trạng thái: Chạy bở hơi tai, mắt xoay mòng mòng',
        life: '⚡ SINH LỰC: 65%'
    },
    {
        subtitle: '☕ "Còn thở là còn gõ... Bố mẹ ơi con vẫn đang học ạ!" 💀',
        mood: '🧟 Trạng thái: Mắt thâm gấu trúc, zombie gõ phím',
        life: '☕ SINH LỰC: 30%'
    },
    {
        subtitle: '😭 "100 Deadline đè bẹp dí... Nhưng chuẩn bị chứng kiến màn lột xác thế kỷ đây!" ⚡',
        mood: '📉 Trạng thái: Kiệt sức tột độ, đang tích tụ năng lượng...',
        life: '🔋 SINH LỰC: 1% (CHUẨN BỊ BÙM NỔ!)'
    }
];

const superheroStory = {
    subtitle: '⚡ "HENSHIN! SIÊU NHÂN HỒNG CỬ NHÂN XUẤT TRẬN! Đánh bay 100 deadline!" 💥',
    mood: '⚡ Trạng thái: Siêu Nhân Hồng bất khả chiến bại, năng lượng vô hạn!',
    life: '⚡ SINH LỰC: 999,999% (SỨC MẠNH TỐI THƯỢNG! 💥)'
};

// ==========================================
// SIÊU NHÂN BIẾN HÌNH CONTROLLER (NĂM 4)
// ==========================================
function triggerSuperheroTransformation() {
    if (superheroTransformTimer) {
        clearTimeout(superheroTransformTimer);
        superheroTransformTimer = null;
    }

    const sceneYear3 = document.getElementById('scene-year-3');
    const exhaustedState = document.getElementById('y4-exhausted-state');
    const burstLayer = document.getElementById('y4-burst-layer');
    const superheroState = document.getElementById('y4-superhero-state');

    // Hiệu ứng rung màn hình chuẩn phim Tokusatsu
    if (sceneYear3) {
        sceneYear3.classList.add('animate-screen-rumble');
        setTimeout(() => sceneYear3.classList.remove('animate-screen-rumble'), 600);
    }

    // Bật tia chớp bùng nổ Henshin
    if (burstLayer) {
        burstLayer.classList.remove('hidden');
        burstLayer.classList.add('flex');
    }

    // Bắn pháo hoa rực rỡ ăn mừng
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#F43F5E', '#FB7185', '#FACC15', '#FFFFFF', '#38BDF8']
        });
        setTimeout(() => {
            confetti({
                particleCount: 90,
                spread: 120,
                origin: { y: 0.4 }
            });
        }, 260);
    }

    // Chuyển sang Video Siêu Nhân Hồng
    setTimeout(() => {
        if (exhaustedState) {
            exhaustedState.classList.add('hidden');
        }
        if (superheroState) {
            superheroState.classList.remove('hidden');
            superheroState.classList.add('flex');
        }

        // Cập nhật phụ đề và chỉ số năng lượng thành Siêu Nhân Hồng
        const subtitleEl = document.getElementById('cinema-subtitle-text');
        const moodEl = document.getElementById('video-stat-mood');
        const lifeEl = document.getElementById('video-stat-life');
        if (subtitleEl) subtitleEl.innerText = superheroStory.subtitle;
        if (moodEl) moodEl.innerText = superheroStory.mood;
        if (lifeEl) lifeEl.innerText = superheroStory.life;

        if (window.lucide) lucide.createIcons();
    }, 200);

    // Tắt lớp flash nổ sau 850ms
    setTimeout(() => {
        if (burstLayer) {
            burstLayer.classList.add('hidden');
            burstLayer.classList.remove('flex');
        }
    }, 850);
}

function resetSuperheroState() {
    if (superheroTransformTimer) {
        clearTimeout(superheroTransformTimer);
        superheroTransformTimer = null;
    }

    const exhaustedState = document.getElementById('y4-exhausted-state');
    const burstLayer = document.getElementById('y4-burst-layer');
    const superheroState = document.getElementById('y4-superhero-state');

    if (burstLayer) {
        burstLayer.classList.add('hidden');
        burstLayer.classList.remove('flex');
    }
    if (superheroState) {
        superheroState.classList.add('hidden');
        superheroState.classList.remove('flex');
    }
    if (exhaustedState) {
        exhaustedState.classList.remove('hidden');
    }

    const subtitleEl = document.getElementById('cinema-subtitle-text');
    const moodEl = document.getElementById('video-stat-mood');
    const lifeEl = document.getElementById('video-stat-life');
    if (subtitleEl) subtitleEl.innerText = defaultYearStory[3].subtitle;
    if (moodEl) moodEl.innerText = defaultYearStory[3].mood;
    if (lifeEl) lifeEl.innerText = defaultYearStory[3].life;
}

function replaySuperheroTransformation() {
    resetSuperheroState();
    superheroTransformTimer = setTimeout(() => {
        triggerSuperheroTransformation();
    }, 500);
}

function setYearScene(index, manual = false) {
    if (index < 0) index = 0;
    if (index > 3) index = 3;
    currentYearIndex = index;

    // Chuyển đổi cảnh hoạt hình
    for (let i = 0; i < 4; i++) {
        const scene = document.getElementById(`scene-year-${i}`);
        const tab = document.getElementById(`chapter-tab-${i}`);
        if (scene) {
            if (i === currentYearIndex) {
                scene.style.display = 'flex';
                scene.classList.add('active');
            } else {
                scene.style.display = 'none';
                scene.classList.remove('active');
            }
        }
        if (tab) {
            if (i === currentYearIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }
    }

    if (editMode) {
        document.querySelectorAll('.draggable-sticker').forEach(s => s.classList.add('drag-active'));
    }

    // Cập nhật thanh timeline
    const progressFill = document.getElementById('video-timeline-fill');
    if (progressFill) {
        const percent = ((currentYearIndex + 1) / 4) * 100;
        progressFill.style.width = `${percent}%`;
    }

    // Cập nhật thời gian hiển thị
    const timeDisplay = document.getElementById('video-time-display');
    if (timeDisplay) {
        timeDisplay.innerText = `00:0${currentYearIndex + 1} / 00:04`;
    }

    // Cập nhật phụ đề & trạng thái
    const subtitleEl = document.getElementById('cinema-subtitle-text');
    const moodEl = document.getElementById('video-stat-mood');
    const lifeEl = document.getElementById('video-stat-life');

    const savedSubtitle = localStorage.getItem(`thiep_edit_s0-subtitle-${currentYearIndex}`);
    const savedMood = localStorage.getItem(`thiep_edit_s0-mood-${currentYearIndex}`);
    const savedLife = localStorage.getItem(`thiep_edit_s0-life-${currentYearIndex}`);

    if (subtitleEl) {
        subtitleEl.innerText = savedSubtitle || defaultYearStory[currentYearIndex].subtitle;
    }
    if (moodEl) {
        moodEl.innerText = savedMood || defaultYearStory[currentYearIndex].mood;
    }
    if (lifeEl) {
        lifeEl.innerText = savedLife || defaultYearStory[currentYearIndex].life;
    }

    // Xử lý biến hình siêu nhân cho Năm 4
    if (currentYearIndex === 3) {
        resetSuperheroState();
        // Tự động biến hình siêu nhân sau 1.8s đau khổ nếu đang ở slide 0
        if (currentSlide === 0) {
            superheroTransformTimer = setTimeout(() => {
                if (currentYearIndex === 3) {
                    triggerSuperheroTransformation();
                }
            }, 1800);
        }
    } else {
        if (superheroTransformTimer) {
            clearTimeout(superheroTransformTimer);
            superheroTransformTimer = null;
        }
    }

}

function nextYearScene() {
    let nextIndex = (currentYearIndex + 1) % 4;
    setYearScene(nextIndex, true);
}

function prevYearScene() {
    let prevIndex = (currentYearIndex - 1 + 4) % 4;
    setYearScene(prevIndex, true);
}

function toggleVideoPlay() {
    // Tính năng tự động phát video đã tắt theo yêu cầu người dùng
    pauseVideoTimer();
}

function pauseVideoTimer() {
    if (videoTimer) {
        clearInterval(videoTimer);
        videoTimer = null;
    }
}

function restartVideoTimer() {
    pauseVideoTimer();
    // Tắt tự động nhảy cảnh để người dùng chủ động xem theo ý muốn
}

function replayVideo() {
    setYearScene(0, true);
}

// Keyboard navigation (ArrowLeft, ArrowRight)
document.addEventListener('keydown', (e) => {
    // Không chuyển slide khi đang gõ chữ trong ô input hoặc contentEditable
    if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    if (e.key === 'ArrowRight') {
        nextSlide();
    } else if (e.key === 'ArrowLeft') {
        prevSlide();
    }
});

// Touch swipe navigation for mobile
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    // Nếu đang kéo sticker hoặc đang gõ chữ thì không vuốt đổi slide
    if (draggedSticker || e.target.isContentEditable) return;
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Ngưỡng vuốt ngang tối thiểu 50px và góc ngang ưu tiên
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
            nextSlide();
        } else {
            prevSlide();
        }
    }
}, { passive: true });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCard);
} else {
    initCard();
}

// ==============================================================================
// 10. HỆ THỐNG RSVP & KẾT NỐI GOOGLE SHEET / QUẢN LÝ KHÁCH MỜI
// ==============================================================================

const GOOGLE_SHEET_KEY = 'thiep_google_sheet_url';
const RSVP_LIST_KEY = 'thiep_rsvp_list';
const MY_RSVP_KEY = 'thiep_my_rsvp_choice';
let pendingRSVPOption = null;

// CẤU HÌNH GOOGLE SHEET WEB APP URL TOÀN HỆ THỐNG
// Đã nhúng sẵn URL Google Apps Script để mọi thiết bị/bạn bè đều tự động gửi được mà không cần kèm link dài:
const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxDkSKFqPqVAZFAqvUlit77ZEf5cyL7_iFBCj07Hq33lYVADuLyMArbpqwhR_c8_yUw/exec';

// Lấy link Google Sheet Web App (ưu tiên cấu hình mã nguồn > link lưu máy > tham số trên link)
function getGoogleSheetUrl() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('sheet');
        if (fromParam && fromParam.trim()) return fromParam.trim();
    } catch(e) {}

    return DEFAULT_GOOGLE_SHEET_URL || localStorage.getItem(GOOGLE_SHEET_KEY) || '';
}

// Khởi tạo module RSVP
function initRSVPModule() {
    // 1. Kiểm tra tham số URL (?to= hoặc ?name= hoặc ?guest=)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const guestFromUrl = urlParams.get('to') || urlParams.get('name') || urlParams.get('guest');
        if (guestFromUrl && guestFromUrl.trim()) {
            const cleanName = guestFromUrl.trim();
            const input = document.getElementById('guest-name-input');
            if (input) {
                input.value = cleanName;
            }
            localStorage.setItem('thiep_guest_name', cleanName);
        }

        // 📊 Tự động lưu link Google Sheet nếu được truyền trong URL thiệp
        const sheetParam = urlParams.get('sheet');
        if (sheetParam && sheetParam.trim()) {
            localStorage.setItem(GOOGLE_SHEET_KEY, sheetParam.trim());
        }

        // 📸 Kiểm tra ảnh kỷ niệm riêng (?pic= hoặc ?photo=)
        const picFromUrl = urlParams.get('pic') || urlParams.get('photo');
        if (picFromUrl && picFromUrl.trim()) {
            setFriendMemoryPhoto(picFromUrl.trim(), guestFromUrl ? guestFromUrl.trim() : '');
        } else if (guestFromUrl && guestFromUrl.trim()) {
            // Kiểm tra xem có ảnh lưu trong thiep_guest_photos trên máy không
            try {
                const photos = JSON.parse(localStorage.getItem('thiep_guest_photos') || '{}');
                const savedPic = photos[guestFromUrl.trim()];
                if (savedPic) {
                    setFriendMemoryPhoto(savedPic, guestFromUrl.trim());
                }
            } catch(e) {}
        }

        // 💌 Kiểm tra lời nhắn riêng (?msg= hoặc ?message=)
        const msgFromUrl = urlParams.get('msg') || urlParams.get('message');
        if (msgFromUrl && msgFromUrl.trim()) {
            const footerEl = document.querySelector('[data-key="s4-footer"]');
            if (footerEl) {
                footerEl.innerText = msgFromUrl.trim();
            }
        }
    } catch (e) {
        console.error('Lỗi đọc URL param:', e);
    }

    // 2. Hiển thị trạng thái phản hồi trước đó (nếu bạn này đã từng bấm)
    const prevChoice = localStorage.getItem(MY_RSVP_KEY);
    if (prevChoice) {
        updateRSVPBadgeDisplay(prevChoice);
    }

    // 3. Tải link Google Sheet vào ô cài đặt trong Admin
    const sheetInput = document.getElementById('admin-google-sheet-url');
    if (sheetInput) {
        sheetInput.value = getGoogleSheetUrl();
    }

    // 4. Phân biệt chế độ Khách mời (Ẩn thanh công cụ sửa) vs Chủ tiệc
    checkAdminOrGuestMode();
}

// Kiểm tra và ẩn/hiện giao diện chỉnh sửa theo quyền
function checkAdminOrGuestMode() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        // Là Admin nếu:
        // 1. Có tham số ?admin=true hoặc hash là #admin
        // 2. Hoặc người dùng đã từng mở khóa quyền admin trên trình duyệt này (localStorage)
        // 3. Hoặc vào trang chính mà KHÔNG có tham số tên khách mời (?to=, ?name=, ?guest=)
        const hasGuestParam = urlParams.has('to') || urlParams.has('name') || urlParams.has('guest');
        const isAdminExplicit = urlParams.get('admin') === 'true' || 
                                hash === '#admin' || 
                                localStorage.getItem('thiep_is_admin') === 'true';

        // CHỈ ẩn công cụ điều khiển khi link có tham số gửi bạn bè (?to=... hoặc ?name=...) VÀ không có cờ admin.
        // Khi chủ tiệc mở trang web (kể cả trên Netlify/Online), toàn bộ thanh điều khiển, nút sửa và RSVP luôn sẵn sàng!
        const isGuest = hasGuestParam && !isAdminExplicit;

        if (isGuest) {
            document.body.classList.add('is-guest');
        } else {
            document.body.classList.remove('is-guest');
        }
    } catch(e) {}
}

// Chạm 3 lần vào thanh tiến trình để mở khóa chế độ Chủ Tiệc (Dành cho chủ tiệc trên điện thoại)
let secretAdminTapCount = 0;
let secretAdminTapTimer = null;
function handleSecretAdminTap() {
    secretAdminTapCount++;
    clearTimeout(secretAdminTapTimer);
    secretAdminTapTimer = setTimeout(() => {
        secretAdminTapCount = 0;
    }, 1500);

    if (secretAdminTapCount >= 3) {
        secretAdminTapCount = 0;
        const wasGuest = document.body.classList.contains('is-guest');
        if (wasGuest) {
            document.body.classList.remove('is-guest');
            localStorage.setItem('thiep_is_admin', 'true');
            if (typeof showEditToast === 'function') {
                showEditToast('🔓 Đã mở khóa Công Cụ Chủ Tiệc & Quản Lý RSVP!');
            }
        } else {
            document.body.classList.add('is-guest');
            localStorage.removeItem('thiep_is_admin');
            if (typeof showEditToast === 'function') {
                showEditToast('🔒 Đã chuyển sang Chế Độ Khách Mời (Giao diện sạch)!');
            }
        }
        if (window.lucide) lucide.createIcons();
    }
}

// Thiết lập ảnh kỷ niệm riêng ở Slide 4
function setFriendMemoryPhoto(picUrl, friendName) {
    applySmartPhotoLayout('s4', picUrl, 'contain', false);
    const btnText2 = document.getElementById('upload-btn-text-2');
    const s4Title = document.querySelector('[data-key="s4-title"]');

    if (btnText2 && friendName) {
        btnText2.innerText = `📸 Ảnh kỷ niệm cùng ${friendName} ❤️`;
    }
    if (s4Title && friendName) {
        s4Title.innerHTML = `KỶ NIỆM CÙNG ${friendName.toUpperCase()}! ❤️`;
    }
}

// Lấy tên khách mời hiện tại
function getCurrentGuestName() {
    // 1. Xem ô input ở slide 2
    const input = document.getElementById('guest-name-input');
    if (input && input.value && input.value.trim() && input.value.trim() !== 'Bạn Cực Phẩm ❤️') {
        return input.value.trim();
    }
    // 2. Xem URL param
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const param = urlParams.get('to') || urlParams.get('name') || urlParams.get('guest');
        if (param && param.trim()) return param.trim();
    } catch(e) {}

    // 3. Xem localStorage
    const saved = localStorage.getItem('thiep_guest_name');
    if (saved && saved.trim() && saved.trim() !== 'Bạn Cực Phẩm ❤️') {
        return saved.trim();
    }

    return '';
}

// Khi khách bấm "🥳 Đi chứ, chắc chắn tới quẩy cùng bạn!"
function triggerRSVPAccept() {
    const guestName = getCurrentGuestName();
    if (!guestName) {
        pendingRSVPOption = 'accept';
        openNamePromptModal('accept');
        return;
    }
    processRSVPSubmit(guestName, 'accept');
}

// Khi khách bấm "🥺 Tiếc quá hôm đó bận rùi, xin lũi bạn nha! ❤️"
function triggerRSVPDecline() {
    const guestName = getCurrentGuestName();
    if (!guestName) {
        pendingRSVPOption = 'decline';
        openNamePromptModal('decline');
        return;
    }
    processRSVPSubmit(guestName, 'decline');
}

// Xử lý gửi phản hồi lên Google Sheet & Lưu nội bộ
async function processRSVPSubmit(guestName, option) {
    const isAccept = (option === 'accept');
    const decisionText = isAccept ? 'Sẽ tham dự 🎉' : 'Bận / Không thể đến 🥺';
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    // Lưu tên khách vào bộ nhớ
    localStorage.setItem('thiep_guest_name', guestName);
    const guestInput = document.getElementById('guest-name-input');
    if (guestInput) guestInput.value = guestName;

    // Lưu phản hồi của người này
    localStorage.setItem(MY_RSVP_KEY, option);
    updateRSVPBadgeDisplay(option);

    // Lưu vào danh sách phản hồi tổng hợp (Offline / Local)
    saveRSVPRecordLocally({
        name: guestName,
        rsvp: decisionText,
        status: option,
        timestamp: timeString
    });

    // Cập nhật trạng thái loading trên nút
    const acceptBtn = document.getElementById('btn-rsvp-accept');
    const declineBtn = document.getElementById('btn-rsvp-decline');
    const originalAcceptHTML = acceptBtn ? acceptBtn.innerHTML : '';
    const originalDeclineHTML = declineBtn ? declineBtn.innerHTML : '';

    if (isAccept && acceptBtn) {
        acceptBtn.innerHTML = '<span>⏳ Đang ghi nhận phản hồi...</span>';
    } else if (!isAccept && declineBtn) {
        declineBtn.innerHTML = '<span>⏳ Đang ghi nhận phản hồi...</span>';
    }

    // Gửi lên Google Sheet nếu đã cấu hình
    const sheetUrl = getGoogleSheetUrl();
    if (sheetUrl) {
        try {
            await fetch(sheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: timeString,
                    name: guestName,
                    rsvp: decisionText,
                    status: option,
                    note: isAccept ? 'Đến dự lễ tốt nghiệp' : 'Bận không tham gia được'
                })
            });
            console.log('✅ Đã gửi phản hồi thành công lên Google Sheet!');
        } catch (err) {
            console.warn('Lỗi khi gửi lên Google Sheet (vẫn đã lưu trong máy):', err);
        }
    }

    // Khôi phục nút
    if (acceptBtn) acceptBtn.innerHTML = originalAcceptHTML;
    if (declineBtn) declineBtn.innerHTML = originalDeclineHTML;
    if (window.lucide) lucide.createIcons();

    // Hiển thị Pop-up Chúc Mừng / Cảm Ơn
    showRSVPModalResult(guestName, isAccept);
}

// Cập nhật huy hiệu trạng thái trên Slide 4
function updateRSVPBadgeDisplay(option) {
    const badge = document.getElementById('rsvp-status-badge');
    const icon = document.getElementById('rsvp-status-icon');
    const text = document.getElementById('rsvp-status-text');
    if (!badge || !icon || !text) return;

    badge.classList.remove('hidden');
    if (option === 'accept') {
        badge.className = 'text-[11px] font-bold py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm flex items-center justify-center gap-1';
        icon.innerText = '🎉';
        text.innerText = 'Bạn đã xác nhận: Sẽ tham dự! (Bấm nút bên trên nếu muốn đổi ý)';
    } else {
        badge.className = 'text-[11px] font-bold py-1 px-3 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-sm flex items-center justify-center gap-1';
        icon.innerText = '🥺';
        text.innerText = 'Bạn đã xác nhận: Tiếc quá bận rồi (Bấm nút bên trên nếu muốn đổi ý)';
    }
}

// Hiển thị modal kết quả
function showRSVPModalResult(guestName, isAccept) {
    const modal = document.getElementById('rsvp-modal');
    const icon = document.getElementById('rsvp-modal-icon');
    const title = document.getElementById('rsvp-modal-title');
    const desc = document.getElementById('rsvp-modal-desc');
    const btn = document.getElementById('rsvp-modal-btn');
    if (!modal) return;

    if (isAccept) {
        if (icon) icon.innerHTML = '🥳';
        if (title) {
            title.innerText = 'HẸN GẶP BẠN NHA! 🎉';
            title.className = 'font-black text-xl text-ueh-blue';
        }
        if (desc) {
            const timeStr = (document.querySelector('[data-key="s3-time"]') || {}).innerText || '9:30 - Sáng';
            desc.innerHTML = `Cảm ơn <strong class="text-ueh-blue text-sm">${guestName}</strong>! Tớ đã ghi tên bạn vào danh sách rồi nè. Nhớ lịch hẹn <strong class="text-ueh-blue">${timeStr} ngày 26/09/2026</strong> tại <strong class="text-ueh-blue">UEH Cơ sở A</strong> nha! 🥰✨`;
        }
        if (btn) btn.innerText = 'Hẹn gặp bạn tại buổi lễ! 🎓';

        // Pháo hoa ăn mừng
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 70,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFB800', '#FF6B6B', '#003B71', '#10B981', '#F59E0B']
            });
        }
    } else {
        if (icon) icon.innerHTML = '🥺';
        if (title) {
            title.innerText = 'CẢM ƠN BẠN RẤT NHIỀU! ❤️';
            title.className = 'font-black text-xl text-pink-600';
        }
        if (desc) {
            desc.innerHTML = `Dù tiếc quá không được gặp <strong class="text-pink-600 text-sm">${guestName}</strong> hôm đó, nhưng nhận được lời phản hồi và tình cảm của bạn là tớ vui và ấm áp lắm rồi! Hẹn dịp khác chúng mình cùng đi trà sữa nha! 🧋✨`;
        }
        if (btn) btn.innerText = 'Gửi trọn tấm lòng! ❤️';
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
}

// Đóng modal kết quả
function closeModal() {
    const modal = document.getElementById('rsvp-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
    }
}

// Modal hỏi tên khách nếu chưa có tên
function openNamePromptModal(option) {
    pendingRSVPOption = option;
    const modal = document.getElementById('name-prompt-modal');
    const input = document.getElementById('prompt-guest-name-input');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 150);
        }
    }
}

function closeNamePromptModal() {
    const modal = document.getElementById('name-prompt-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
    }
    pendingRSVPOption = null;
}

function submitNamePromptRSVP() {
    const input = document.getElementById('prompt-guest-name-input');
    const name = input ? input.value.trim() : '';
    if (!name) {
        alert('Vui lòng nhập tên của bạn để chủ tiệc biết nha! ❤️');
        if (input) input.focus();
        return;
    }
    const option = pendingRSVPOption || 'accept';
    closeNamePromptModal();
    processRSVPSubmit(name, option);
}

// Lưu bản ghi RSVP vào LocalStorage
function saveRSVPRecordLocally(record) {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(RSVP_LIST_KEY) || '[]');
    } catch (e) {
        list = [];
    }

    // Nếu đã có tên này, cập nhật trạng thái mới nhất; nếu chưa thì thêm mới
    const idx = list.findIndex(item => item.name.toLowerCase() === record.name.toLowerCase());
    if (idx >= 0) {
        list[idx] = record;
    } else {
        list.push(record);
    }

    localStorage.setItem(RSVP_LIST_KEY, JSON.stringify(list));
}

// ==============================================================================
// 11. BẢNG ĐIỀU KHIỂN DÀNH CHO CHỦ TIỆC (ADMIN DASHBOARD)
// ==============================================================================

function openAdminRSVPModal() {
    const modal = document.getElementById('admin-rsvp-modal');
    if (!modal) return;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');

    // Mặc định mở tab danh sách
    switchAdminTab('list');
    renderAdminRSVPList();

    const sheetInput = document.getElementById('admin-google-sheet-url');
    if (sheetInput) {
        sheetInput.value = getGoogleSheetUrl();
    }

    // Tự động điền Base Website URL nếu có
    const baseWebInput = document.getElementById('admin-base-website-url');
    if (baseWebInput) {
        const savedBase = localStorage.getItem('thiep_base_website_url');
        if (savedBase) {
            baseWebInput.value = savedBase;
        } else if (window.location.protocol.startsWith('http')) {
            baseWebInput.value = window.location.origin + window.location.pathname;
        }
    }

    if (window.lucide) lucide.createIcons();
}

function closeAdminRSVPModal() {
    const modal = document.getElementById('admin-rsvp-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
    }
}

function switchAdminTab(tabName) {
    const tabs = ['list', 'links', 'sheet', 'music'];
    tabs.forEach(tab => {
        const content = document.getElementById(`admin-tab-${tab}`);
        const btn = document.getElementById(`admin-tab-btn-${tab}`);
        if (content) {
            if (tab === tabName) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        }
        if (btn) {
            if (tab === tabName) {
                btn.className = 'flex-1 py-1.5 rounded-lg text-xs font-black transition bg-white text-ueh-blue shadow-sm';
            } else {
                btn.className = 'flex-1 py-1.5 rounded-lg text-xs font-black transition text-slate-600 hover:text-slate-900';
            }
        }
    });

    if (tabName === 'list') {
        renderAdminRSVPList();
    }
    if (window.lucide) lucide.createIcons();
}

// Hiển thị danh sách khách mời trong Admin
function renderAdminRSVPList() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(RSVP_LIST_KEY) || '[]');
    } catch (e) {
        list = [];
    }

    const tbody = document.getElementById('admin-rsvp-table-body');
    const statTotal = document.getElementById('stat-total');
    const statAccept = document.getElementById('stat-accept');
    const statDecline = document.getElementById('stat-decline');

    const total = list.length;
    const acceptCount = list.filter(item => item.status === 'accept').length;
    const declineCount = list.filter(item => item.status === 'decline').length;

    if (statTotal) statTotal.innerText = total;
    if (statAccept) statAccept.innerText = acceptCount;
    if (statDecline) statDecline.innerText = declineCount;

    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="p-6 text-center text-slate-400 font-bold">
                    Chưa có ai gửi phản hồi.<br>
                    <span class="text-[11px] font-normal text-slate-400">Hãy chuyển sang tab "Tạo Link Gửi" để gửi thiệp cho bạn bè nhé!</span>
                </td>
            </tr>
        `;
        return;
    }

    let rowsHtml = '';
    list.slice().reverse().forEach(item => {
        const isAccept = item.status === 'accept';
        const badgeClass = isAccept ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
        rowsHtml += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-2 font-bold text-slate-800">${item.name}</td>
                <td class="p-2">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                        ${item.rsvp}
                    </span>
                </td>
                <td class="p-2 text-right text-[10px] text-slate-400 font-mono">${item.timestamp || ''}</td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

// Xuất danh sách ra file CSV mở bằng Excel
function exportRSVPToCSV() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(RSVP_LIST_KEY) || '[]');
    } catch (e) {
        list = [];
    }

    if (list.length === 0) {
        alert('Danh sách phản hồi hiện đang trống!');
        return;
    }

    // Tiền tố BOM \uFEFF giúp Excel mở đúng tiếng Việt có dấu
    let csvContent = '\uFEFFSTT,Tên Khách Mời,Quyết Định,Trạng Thái,Thời Gian Gửi\r\n';
    list.forEach((item, index) => {
        const row = [
            index + 1,
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${(item.rsvp || '').replace(/"/g, '""')}"`,
            `"${(item.status || '').replace(/"/g, '""')}"`,
            `"${(item.timestamp || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_RSVP_UEH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Xóa danh sách phản hồi
function clearRSVPRecords() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách phản hồi đã lưu trên trình duyệt này không?')) {
        localStorage.removeItem(RSVP_LIST_KEY);
        localStorage.removeItem(MY_RSVP_KEY);
        const badge = document.getElementById('rsvp-status-badge');
        if (badge) badge.classList.add('hidden');
        renderAdminRSVPList();
    }
}

let currentFriendPhotoData = '';
let lastGeneratedInviteUrl = '';

// Xử lý khi chủ tiệc chọn ảnh kỷ niệm riêng cho bạn bè
function handleFriendPhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Nén ảnh bằng Canvas tối đa 600px để link và bộ nhớ mượt mà
            const canvas = document.createElement('canvas');
            const maxDim = 600;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            currentFriendPhotoData = canvas.toDataURL('image/jpeg', 0.82);

            // Hiển thị preview
            const previewBox = document.getElementById('generator-photo-preview-box');
            const previewImg = document.getElementById('generator-photo-preview-img');
            const btnText = document.getElementById('generator-photo-btn-text');
            if (previewBox && previewImg) {
                previewImg.src = currentFriendPhotoData;
                previewBox.classList.remove('hidden');
            }
            if (btnText) btnText.innerText = 'Đổi ảnh khác';
            if (window.lucide) lucide.createIcons();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Gỡ ảnh kỷ niệm đã chọn
function removeFriendPhotoSelected() {
    currentFriendPhotoData = '';
    const input = document.getElementById('generator-friend-photo-input');
    const previewBox = document.getElementById('generator-photo-preview-box');
    const previewImg = document.getElementById('generator-photo-preview-img');
    const btnText = document.getElementById('generator-photo-btn-text');
    if (input) input.value = '';
    if (previewImg) previewImg.src = '';
    if (previewBox) previewBox.classList.add('hidden');
    if (btnText) btnText.innerText = 'Chọn ảnh kỷ niệm từ máy';
}

// Tạo link mời cá nhân hóa cho từng bạn bè (Kèm tên, lời nhắn & ảnh kỷ niệm)
function generateCustomInviteLink() {
    const nameInput = document.getElementById('generator-friend-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        alert('Vui lòng nhập tên bạn bè cần gửi thiệp! Ví dụ: "Hoàng Yến"');
        if (nameInput) nameInput.focus();
        return;
    }

    const msgInput = document.getElementById('generator-friend-message');
    const customMsg = msgInput ? msgInput.value.trim() : '';

    const photoUrlInput = document.getElementById('generator-friend-photo-url');
    const directPhotoUrl = photoUrlInput ? photoUrlInput.value.trim() : '';

    // Xác định Base URL
    const baseWebInput = document.getElementById('admin-base-website-url');
    let baseUrl = baseWebInput ? baseWebInput.value.trim() : '';
    if (baseUrl) {
        // Tự động thêm https:// nếu người dùng quên gõ
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://') && !baseUrl.startsWith('file://')) {
            baseUrl = 'https://' + baseUrl;
            baseWebInput.value = baseUrl;
        }
        localStorage.setItem('thiep_base_website_url', baseUrl);
    } else {
        if (window.location.protocol.startsWith('http')) {
            baseUrl = window.location.origin + window.location.pathname;
        } else {
            baseUrl = window.location.origin + window.location.pathname;
        }
    }

    // Xây dựng link với URLSearchParams
    let finalUrl = '';
    try {
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.set('to', name);
        if (customMsg) {
            urlObj.searchParams.set('msg', customMsg);
        }
        if (directPhotoUrl) {
            urlObj.searchParams.set('pic', directPhotoUrl);
        } else if (currentFriendPhotoData) {
            // Lưu vào danh bạ ảnh local trên máy của chủ tiệc
            try {
                const photos = JSON.parse(localStorage.getItem('thiep_guest_photos') || '{}');
                photos[name] = currentFriendPhotoData;
                localStorage.setItem('thiep_guest_photos', JSON.stringify(photos));
            } catch(e) {}
        }

        // Chỉ gắn link Google Sheet nếu khác với mặc định đã nhúng trong mã nguồn
        const currentSheetUrl = getGoogleSheetUrl();
        if (currentSheetUrl && currentSheetUrl !== DEFAULT_GOOGLE_SHEET_URL) {
            urlObj.searchParams.set('sheet', currentSheetUrl);
        }

        // Gắn bài hát đã chọn nếu là link online
        const currentMusic = localStorage.getItem(MUSIC_STORAGE_KEY);
        if (currentMusic && currentMusic.startsWith('http')) {
            urlObj.searchParams.set('music', currentMusic);
        }

        finalUrl = urlObj.toString();
    } catch(err) {
        finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}to=${encodeURIComponent(name)}`;
        if (customMsg) finalUrl += `&msg=${encodeURIComponent(customMsg)}`;
        if (directPhotoUrl) finalUrl += `&pic=${encodeURIComponent(directPhotoUrl)}`;
        const currentSheetUrl = getGoogleSheetUrl();
        if (currentSheetUrl && currentSheetUrl !== DEFAULT_GOOGLE_SHEET_URL) {
            finalUrl += `&sheet=${encodeURIComponent(currentSheetUrl)}`;
        }
        const currentMusic = localStorage.getItem(MUSIC_STORAGE_KEY);
        if (currentMusic && currentMusic.startsWith('http')) finalUrl += `&music=${encodeURIComponent(currentMusic)}`;
    }

    lastGeneratedInviteUrl = finalUrl;

    // Cập nhật hiển thị giao diện
    const container = document.getElementById('generated-link-container');
    const outputInput = document.getElementById('generated-link-input');
    const previewName = document.getElementById('preview-target-name');

    if (outputInput) outputInput.value = finalUrl;
    if (previewName) previewName.innerText = name;
    if (container) container.classList.remove('hidden');

    // Tự động sao chép link vào clipboard
    copyGeneratedLinkAgain();

    // Cảnh báo nếu đang ở dạng file:// để người dùng biết cách gửi qua Zalo/Messenger
    if (finalUrl.startsWith('file:///')) {
        alert(`⚠️ Đã sao chép link cho "${name}"!\n\nLƯU Ý QUAN TRỌNG:\nLink hiện tại bắt đầu bằng "file:///" (ổ đĩa máy tính của bạn). Zalo và Messenger sẽ KHÔNG cho bạn bè bấm mở từ điện thoại được.\n\n👉 Bạn hãy đưa thư mục thiệp lên mạng (như trang web miễn phí Netlify Drop / GitHub) rồi dán link web đó vào ô "Địa chỉ Website thiệp" ở trên nhé!`);
    }
}

// Sao chép lại link
function copyGeneratedLinkAgain() {
    const outputInput = document.getElementById('generated-link-input');
    const url = outputInput ? outputInput.value : lastGeneratedInviteUrl;
    if (!url) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof showEditToast === 'function') {
                showEditToast('✓ Đã sao chép link vào bộ nhớ tạm!');
            }
        }).catch(() => {
            if (outputInput) {
                outputInput.select();
                document.execCommand('copy');
            }
        });
    } else if (outputInput) {
        outputInput.select();
        document.execCommand('copy');
    }
}

// Mở xem thử link thiệp trong tab mới
function previewGeneratedLinkInNewTab() {
    const outputInput = document.getElementById('generated-link-input');
    const url = outputInput ? outputInput.value : lastGeneratedInviteUrl;
    if (url) {
        window.open(url, '_blank');
    }
}

// Lưu link Google Sheet từ Admin
function saveGoogleSheetUrlFromAdmin() {
    const input = document.getElementById('admin-google-sheet-url');
    const url = input ? input.value.trim() : '';

    if (!url) {
        localStorage.removeItem(GOOGLE_SHEET_KEY);
        alert('Đã xóa cấu hình URL Google Sheet!');
        return;
    }

    if (!url.startsWith('https://script.google.com/')) {
        alert('URL Google Apps Script phải bắt đầu bằng: https://script.google.com/macros/s/.../exec\n\nVui lòng kiểm tra lại theo hướng dẫn!');
        return;
    }

    localStorage.setItem(GOOGLE_SHEET_KEY, url);
    alert('🎉 Đã lưu đường link Google Sheet thành công!\nTừ giờ mỗi phản hồi của bạn bè sẽ tự động ghi vào trang tính của bạn.');
}

// Gửi 1 dòng test lên Google Sheet
async function testGoogleSheetConnection() {
    const url = getGoogleSheetUrl();
    if (!url) {
        alert('Bạn chưa nhập URL Google Apps Script Web App!\nVui lòng dán link vào ô trên và bấm "Lưu Link Google Sheet" trước nhé.');
        return;
    }

    try {
        const now = new Date();
        const testTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: testTime,
                name: 'TEST - Chủ Nhân Thiệp',
                rsvp: 'Đang kiểm tra kết nối',
                status: 'accept',
                note: 'Dòng thử nghiệm kiểm tra kết nối thành công!'
            })
        });

        alert('✨ Đã gửi thành công 1 dòng thử nghiệm!\nBạn hãy mở Google Sheet ra kiểm tra xem có dòng "TEST - Chủ Nhân Thiệp" xuất hiện chưa nhé!');
    } catch (err) {
        alert('Không thể gửi đến Google Sheet: ' + err.message + '\nKiểm tra lại xem khi Triển khai (Deploy) bạn đã chọn "Ai có quyền truy cập: Bất kỳ ai (Anyone)" chưa nhé.');
    }
}

// ==============================================================================
// 11. HỆ THỐNG PHÁT NHẠC NỀN & QUẢN LÝ BÀI HÁT (BACKGROUND MUSIC CONTROLLER)
// ==============================================================================
const MUSIC_STORAGE_KEY = 'thiep_bg_music_url';
const MUSIC_NAME_KEY = 'thiep_bg_music_name';

const MUSIC_PRESETS = {
    graduation: {
        name: 'Bài ca Tốt Nghiệp Rộn Ràng 🎓',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=positive-happy-day-111867.mp3'
    },
    acoustic: {
        name: 'Ký Ức Thanh Xuân (Piano & Acoustic) 🌸',
        url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=warm-memories-123483.mp3'
    },
    lofi: {
        name: 'Lo-Fi Chill Học Đường ☕',
        url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-study-112191.mp3'
    }
};

let isMusicPlaying = false;
let userHasInteracted = false;

function initMusicSystem() {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    // Âm lượng mặc định vừa phải, du dương (50%)
    audio.volume = 0.5;

    // Kiểm tra bài hát được truyền qua tham số URL (?music=...)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const musicFromUrl = urlParams.get('music');
        if (musicFromUrl && musicFromUrl.trim()) {
            audio.src = musicFromUrl.trim();
            updateMusicDisplayInfo('Nhạc theo link thiệp 🎵');
            return;
        }
    } catch(e) {}

    // Tải bài hát đã lưu nếu có
    const savedUrl = localStorage.getItem(MUSIC_STORAGE_KEY);
    const savedName = localStorage.getItem(MUSIC_NAME_KEY);

    if (savedUrl) {
        audio.src = savedUrl;
        updateMusicDisplayInfo(savedName || 'Nhạc tự chọn 🎵');
    } else {
        // Thử tìm nhac.mp3 trong cùng thư mục
        audio.src = 'nhac.mp3';
        updateMusicDisplayInfo('nhac.mp3 (Thư mục thiệp)');

        audio.addEventListener('error', function onLocalAudioError() {
            // Nếu không có file nhac.mp3 cục bộ thì fallback sang bản nhạc tốt nghiệp trực tuyến
            audio.src = MUSIC_PRESETS.graduation.url;
            updateMusicDisplayInfo(MUSIC_PRESETS.graduation.name);
            audio.removeEventListener('error', onLocalAudioError);
        }, { once: true });
    }

    // Lắng nghe trạng thái audio
    audio.addEventListener('play', () => {
        isMusicPlaying = true;
        updateMusicButtonUI(true);
    });

    audio.addEventListener('pause', () => {
        isMusicPlaying = false;
        updateMusicButtonUI(false);
    });

    // Lắng nghe cú chạm/click đầu tiên vào thiệp để phát nhạc (đáp ứng Autoplay Policy của trình duyệt)
    const triggerAudioOnFirstAction = () => {
        if (!userHasInteracted) {
            userHasInteracted = true;
            tryAutoPlayMusic();
        }
    };

    const container = document.getElementById('card-container') || document.body;
    container.addEventListener('click', triggerAudioOnFirstAction, { once: true });
    container.addEventListener('touchstart', triggerAudioOnFirstAction, { once: true, passive: true });
}

function tryAutoPlayMusic() {
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    if (localStorage.getItem('thiep_music_muted') === 'true') return;

    audio.play().then(() => {
        isMusicPlaying = true;
        updateMusicButtonUI(true);
    }).catch(() => {
        // Trình duyệt có thể chờ thêm 1 click tường minh
    });
}

function toggleMusicPlayback(e) {
    if (e) e.stopPropagation();
    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    if (audio.paused) {
        audio.play().then(() => {
            isMusicPlaying = true;
            localStorage.setItem('thiep_music_muted', 'false');
            updateMusicButtonUI(true);
            spawnMusicNoteEffect();
            if (typeof showEditToast === 'function') {
                showEditToast('🎵 Đang phát nhạc nền!');
            }
        }).catch(err => {
            console.warn('Lỗi phát nhạc:', err);
        });
    } else {
        audio.pause();
        isMusicPlaying = false;
        localStorage.setItem('thiep_music_muted', 'true');
        updateMusicButtonUI(false);
        if (typeof showEditToast === 'function') {
            showEditToast('🔇 Đã tạm dừng nhạc');
        }
    }
}

function updateMusicButtonUI(playing) {
    const btn = document.getElementById('btn-music-toggle');
    const icon = document.getElementById('music-btn-icon');
    const adminIcon = document.getElementById('admin-music-status-icon');
    const adminPlayText = document.getElementById('admin-music-play-text');

    if (btn) {
        if (playing) {
            btn.classList.add('playing');
            btn.title = 'Bấm để tắt nhạc';
        } else {
            btn.classList.remove('playing');
            btn.title = 'Bấm để bật nhạc';
        }
    }

    if (icon) {
        icon.setAttribute('data-lucide', playing ? 'music' : 'volume-x');
    }

    if (adminIcon) {
        adminIcon.innerHTML = playing ? 
            '<i data-lucide="disc" class="w-4 h-4 animate-spin text-pink-600"></i>' : 
            '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i>';
    }

    if (adminPlayText) {
        adminPlayText.innerText = playing ? 'Tạm dừng' : 'Nghe thử';
    }

    if (window.lucide) lucide.createIcons();
}

function updateMusicDisplayInfo(songName) {
    const displayEl = document.getElementById('admin-current-song-name');
    if (displayEl) {
        displayEl.innerText = songName;
    }
}

function spawnMusicNoteEffect() {
    const btn = document.getElementById('btn-music-toggle');
    if (!btn) return;

    const notes = ['🎵', '🎶', '✨', '💖'];
    const note = document.createElement('span');
    note.className = 'music-note-fly';
    note.innerText = notes[Math.floor(Math.random() * notes.length)];
    
    const rect = btn.getBoundingClientRect();
    note.style.top = `${rect.top}px`;
    note.style.left = `${rect.left}px`;
    document.body.appendChild(note);

    setTimeout(() => note.remove(), 1600);
}

function setMusicPreset(presetKey) {
    const preset = MUSIC_PRESETS[presetKey];
    if (!preset) return;

    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    audio.src = preset.url;
    audio.play().then(() => {
        isMusicPlaying = true;
        updateMusicButtonUI(true);
    }).catch(() => {});

    localStorage.setItem(MUSIC_STORAGE_KEY, preset.url);
    localStorage.setItem(MUSIC_NAME_KEY, preset.name);
    localStorage.setItem('thiep_music_muted', 'false');

    updateMusicDisplayInfo(preset.name);
    spawnMusicNoteEffect();
    alert(`🎉 Đã chọn bài hát: "${preset.name}" thành công!`);
}

function handleMusicFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    const fileUrl = URL.createObjectURL(file);
    audio.src = fileUrl;
    audio.play().then(() => {
        isMusicPlaying = true;
        updateMusicButtonUI(true);
    }).catch(() => {});

    const songTitle = `📁 ${file.name}`;
    updateMusicDisplayInfo(songTitle);

    localStorage.setItem(MUSIC_NAME_KEY, songTitle);
    localStorage.setItem('thiep_music_muted', 'false');

    spawnMusicNoteEffect();
    alert(`✨ Đã nạp thành công bài hát: "${file.name}"!\n\n💡 Mẹo khi triển khai web: Hãy copy bài hát này vào cùng thư mục thiệp và đổi tên thành nhac.mp3 để khi bạn bè mở máy là nghe được ngay nhé!`);
}

function applyCustomMusicUrl() {
    const input = document.getElementById('music-url-input');
    const url = input ? input.value.trim() : '';

    if (!url) {
        alert('Vui lòng dán link file MP3 vào ô!');
        return;
    }

    const audio = document.getElementById('bg-audio');
    if (!audio) return;

    audio.src = url;
    audio.play().then(() => {
        isMusicPlaying = true;
        updateMusicButtonUI(true);
    }).catch(err => {
        alert('Không thể phát file từ đường link này: ' + err.message + '\nHãy chắc chắn đường link kết thúc bằng .mp3 hoặc là link trực tiếp.');
    });

    const songTitle = `🔗 Link tùy chọn: ${url.split('/').pop() || 'Nhạc Online'}`;
    localStorage.setItem(MUSIC_STORAGE_KEY, url);
    localStorage.setItem(MUSIC_NAME_KEY, songTitle);
    localStorage.setItem('thiep_music_muted', 'false');

    updateMusicDisplayInfo(songTitle);
    spawnMusicNoteEffect();
    alert('🎉 Đã lưu đường link bài hát thành công!');
}

// ==========================================
// TỰ ĐỘNG KHỞI TẠO KHUNG ẢNH KHI MỞ TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tự động khôi phục ảnh và tính toán kích thước khung ảnh hoàn mỹ
    restoreSavedUserPhotos();

    // 2. Tự động căn chỉnh lại khi xoay màn hình hoặc resize
    window.addEventListener('resize', () => {
        ['s1', 's4'].forEach(slot => {
            const savedSrc = localStorage.getItem(PHOTO_STORAGE_KEYS[slot].src);
            if (savedSrc) {
                applySmartPhotoLayout(slot, savedSrc, 'cover', false);
            }
        });
    });
});
