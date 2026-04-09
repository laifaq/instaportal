// ========================================
//  PromptCraft Studio v2 - App.js
//  Gemini AI-Powered Prompt Generator
// ========================================

(function () {
    'use strict';

    // ==========================================
    //  DOM REFERENCES
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const toastContainer = document.getElementById('toastContainer');
    const copyFeedback = document.getElementById('copyFeedback');
    const totalPromptsEl = document.getElementById('totalPrompts');

    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page');

    // ==========================================
    //  STATE
    // ==========================================
    let history = JSON.parse(localStorage.getItem('promptcraft_history') || '[]');
    let totalPrompts = parseInt(localStorage.getItem('promptcraft_total') || '0');
    let userName = localStorage.getItem('promptcraft_name') || 'User';
    let geminiApiKey = localStorage.getItem('promptcraft_gemini_key') || '';
    let apiKeyVerified = localStorage.getItem('promptcraft_api_verified') === 'true';

    // ==========================================
    //  INITIALIZATION
    // ==========================================
    function init() {
        updateTotalPrompts();
        updateUserProfile();
        updateApiStatus();
        setupSidebar();
        setupNavigation();
        setupChipGroups();
        setupToolCards();
        setupImageGenerator();
        setupVideoGenerator();
        setupAffiliateGenerator();
        setupHistoryPage();
        setupTemplatesPage();
        setupSettingsPage();
        setupChatAssistant();
        renderRecentActivity();
    }

    // ==========================================
    //  SIDEBAR & NAVIGATION
    // ==========================================
    function setupSidebar() {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        });

        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    function setupNavigation() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
                closeMobileSidebar();
            });
        });
    }

    function navigateTo(pageName) {
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });
        pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
        });

        if (pageName === 'history') renderHistory();
        if (pageName === 'templates') renderTemplates();
        if (pageName === 'dashboard') renderRecentActivity();
        if (pageName === 'settings') loadSettings();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setupToolCards() {
        document.querySelectorAll('.tool-card[data-page]').forEach(card => {
            card.addEventListener('click', () => {
                navigateTo(card.dataset.page);
            });
        });
    }

    // ==========================================
    //  USER PROFILE & API STATUS
    // ==========================================
    function updateUserProfile() {
        document.getElementById('userName').textContent = userName;
        document.getElementById('welcomeName').textContent = userName;
        document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();
    }

    function updateApiStatus() {
        const icon = document.getElementById('apiStatusIcon');
        const text = document.getElementById('apiStatusText');
        const btn = document.getElementById('apiSetupBtn');
        const indicator = document.getElementById('apiIndicator');
        const mobileApiDot = document.getElementById('mobileApiDot');

        if (geminiApiKey && apiKeyVerified) {
            icon.classList.add('connected');
            icon.innerHTML = '<i class="fas fa-check-circle"></i>';
            text.textContent = 'API key connected — AI-powered generation active';
            text.style.color = '#10b981';
            btn.innerHTML = '<i class="fas fa-gear"></i> Manage';
            indicator.innerHTML = '<span class="api-dot online"></span><span class="api-text">Online</span>';
            mobileApiDot.innerHTML = '<span class="api-dot online"></span>';
        } else {
            icon.classList.remove('connected');
            icon.innerHTML = '<i class="fas fa-key"></i>';
            text.textContent = 'No API key configured';
            text.style.color = '';
            btn.innerHTML = '<i class="fas fa-key"></i> Set API Key';
            indicator.innerHTML = '<span class="api-dot offline"></span><span class="api-text">Offline</span>';
            mobileApiDot.innerHTML = '<span class="api-dot offline"></span>';
        }
    }

    // ==========================================
    //  CHIP GROUPS
    // ==========================================
    function setupChipGroups() {
        document.querySelectorAll('.chip-group').forEach(group => {
            const isMulti = group.classList.contains('multi');
            group.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    if (isMulti) {
                        chip.classList.toggle('active');
                    } else {
                        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                    }
                });
            });
        });
    }

    function getActiveChipValue(groupId) {
        const group = document.getElementById(groupId);
        if (!group) return '';
        const active = group.querySelector('.chip.active');
        return active ? active.dataset.value : '';
    }

    function getActiveChipValues(groupId) {
        const group = document.getElementById(groupId);
        if (!group) return [];
        return Array.from(group.querySelectorAll('.chip.active')).map(c => c.dataset.value);
    }

    // ==========================================
    //  GEMINI API INTEGRATION
    // ==========================================
    const GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
        'gemini-pro-latest'
    ];

    async function generateWithGemini(systemPrompt, userPrompt) {
        if (!geminiApiKey || !apiKeyVerified) return null;

        for (const model of GEMINI_MODELS) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                            }],
                            generationConfig: {
                                temperature: 0.85,
                                maxOutputTokens: 2048
                            }
                        })
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log(`Generated with model: ${model}`);
                    return text;
                }
            } catch (error) {
                console.warn(`Model ${model} failed:`, error.message);
                continue;
            }
        }

        console.error('All Gemini models failed');
        return null;
    }

    async function verifyApiKey(key) {
        // Method 1: Try listing models (GET request, most reliable)
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
            );
            if (response.ok) return true;
        } catch (e) {
            console.warn('List models failed:', e.message);
        }

        // Method 2: Try a simple generateContent call with each model
        for (const model of GEMINI_MODELS) {
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Hi' }] }],
                            generationConfig: { maxOutputTokens: 5 }
                        })
                    }
                );
                if (response.ok) return true;
            } catch {
                continue;
            }
        }

        return false;
    }

    // ==========================================
    //  IMAGE PROMPT GENERATOR
    // ==========================================
    function setupImageGenerator() {
        const generateBtn = document.getElementById('generateImagePrompt');
        const copyBtn = document.getElementById('copyImagePrompt');
        const saveBtn = document.getElementById('saveImagePrompt');

        let currentPrompt = '';

        generateBtn.addEventListener('click', async () => {
            const subject = document.getElementById('imgSubject').value.trim();
            if (!subject) {
                showToast('error', 'Subjek Diperlukan', 'Silakan isi deskripsi subjek utama.');
                document.getElementById('imgSubject').focus();
                return;
            }

            generateBtn.classList.add('loading');

            const style = document.getElementById('imgStyle').value;
            const mood = document.getElementById('imgMood').value;
            const color = document.getElementById('imgColor').value;
            const lighting = document.getElementById('imgLighting').value;
            const angle = document.getElementById('imgAngle').value;
            const ratio = document.getElementById('imgRatio').value;
            const quality = document.getElementById('imgQuality').value;
            const extra = document.getElementById('imgExtra').value.trim();
            const negative = document.getElementById('imgNegative').value.trim();
            const platform = getActiveChipValue('imgPlatformChips');

            // Try Gemini first
            let aiPrompt = null;
            if (geminiApiKey && apiKeyVerified) {
                const systemPrompt = `You are an expert AI image prompt engineer. Generate a professional, highly detailed prompt for ${platform || 'AI image generation'}. Output ONLY the prompt text, nothing else. No explanations, no labels, just the raw prompt. Make it detailed, specific, and optimized for the target platform.`;

                let userRequest = `Subject: ${subject}`;
                if (style) userRequest += `\nArt style: ${style}`;
                if (mood) userRequest += `\nMood: ${mood}`;
                if (color) userRequest += `\nColor palette: ${color}`;
                if (lighting) userRequest += `\nLighting: ${lighting}`;
                if (angle) userRequest += `\nCamera angle: ${angle}`;
                if (quality) userRequest += `\nQuality: ${quality}`;
                if (extra) userRequest += `\nAdditional details: ${extra}`;
                if (platform === 'midjourney' && ratio) userRequest += `\nInclude ${ratio} at the end`;
                if (platform === 'midjourney') userRequest += `\nInclude --v 6.1 at the end`;

                aiPrompt = await generateWithGemini(systemPrompt, userRequest);
            }

            if (aiPrompt) {
                currentPrompt = aiPrompt.trim();
            } else {
                currentPrompt = buildImagePrompt({ subject, style, mood, color, lighting, angle, ratio, quality, extra, platform });
            }

            renderImageOutput(currentPrompt, negative, ratio, platform, !!aiPrompt);
            copyBtn.disabled = false;
            saveBtn.disabled = false;
            generateBtn.classList.remove('loading');
            totalPrompts++;
            updateTotalPrompts();
            showToast('success', 'Prompt Dibuat!', aiPrompt ? 'AI-powered prompt generated ✨' : 'Template prompt generated.');
        });

        copyBtn.addEventListener('click', () => { if (currentPrompt) copyToClipboard(currentPrompt); });
        saveBtn.addEventListener('click', () => {
            if (currentPrompt) {
                saveToHistory('image', currentPrompt);
                showToast('success', 'Tersimpan!', 'Prompt disimpan ke History.');
            }
        });
    }

    function buildImagePrompt({ subject, style, mood, color, lighting, angle, ratio, quality, extra, platform }) {
        let parts = [subject];
        if (style) parts.push(`${style} style`);
        if (mood) parts.push(`${mood} atmosphere`);
        if (color) parts.push(color);
        if (lighting) parts.push(lighting);
        if (angle) parts.push(angle);
        if (quality) parts.push(quality);
        if (extra) parts.push(extra);

        if (platform === 'midjourney') {
            parts.push('--v 6.1');
            if (quality === 'masterpiece quality') parts.push('--q 2');
        } else if (platform === 'stable-diffusion') {
            if (!quality) parts.push('best quality, masterpiece');
            parts.push('extremely detailed');
        }

        let prompt = parts.join(', ');
        if (ratio && platform === 'midjourney') prompt += ` ${ratio}`;
        return prompt;
    }

    function renderImageOutput(prompt, negative, ratio, platform, isAI) {
        const outputArea = document.getElementById('imageOutput');
        let html = `<div class="output-content">`;

        html += `<div class="output-section">
            <div class="output-section-title"><i class="fas fa-sparkles"></i> PROMPT UTAMA</div>
            <div class="output-prompt">${escapeHtml(prompt)}<button class="output-prompt-copy" onclick="app.copyText(\`${escapeForJs(prompt)}\`)" title="Copy"><i class="fas fa-copy"></i></button></div>
        </div>`;

        if (negative) {
            html += `<div class="output-section">
                <div class="output-section-title"><i class="fas fa-ban"></i> NEGATIVE PROMPT</div>
                <div class="output-prompt" style="border-color: rgba(239,68,68,0.12); background: rgba(239,68,68,0.03);">${escapeHtml(negative)}<button class="output-prompt-copy" onclick="app.copyText(\`${escapeForJs(negative)}\`)" title="Copy"><i class="fas fa-copy"></i></button></div>
            </div>`;
        }

        let tags = [];
        if (platform) tags.push(platform.charAt(0).toUpperCase() + platform.slice(1));
        if (ratio) tags.push(ratio);
        const style = document.getElementById('imgStyle').value;
        if (style) tags.push(style);
        if (isAI) tags.push('✨ AI Generated');

        if (tags.length > 0) {
            html += `<div class="output-section">
                <div class="output-section-title"><i class="fas fa-tags"></i> TAGS</div>
                <div class="output-tags">${tags.map(t => `<span class="output-tag">${escapeHtml(t)}</span>`).join('')}</div>
            </div>`;
        }

        html += `</div>`;
        outputArea.innerHTML = html;
    }

    // ==========================================
    //  VIDEO PROMPT GENERATOR
    // ==========================================
    function setupVideoGenerator() {
        const generateBtn = document.getElementById('generateVideoPrompt');
        const copyBtn = document.getElementById('copyVideoPrompt');
        const saveBtn = document.getElementById('saveVideoPrompt');
        let currentPrompt = '';

        generateBtn.addEventListener('click', async () => {
            const concept = document.getElementById('vidConcept').value.trim();
            if (!concept) {
                showToast('error', 'Konsep Diperlukan', 'Silakan isi konsep/cerita utama video.');
                document.getElementById('vidConcept').focus();
                return;
            }

            generateBtn.classList.add('loading');

            const scene = document.getElementById('vidScene').value.trim();
            const style = document.getElementById('vidStyle').value;
            const movement = document.getElementById('vidMovement').value;
            const mood = document.getElementById('vidMood').value;
            const duration = document.getElementById('vidDuration').value;
            const lighting = document.getElementById('vidLighting').value;
            const extra = document.getElementById('vidExtra').value.trim();
            const platform = getActiveChipValue('vidPlatformChips');

            let aiPrompt = null;
            if (geminiApiKey && apiKeyVerified) {
                const systemPrompt = `You are an expert AI video prompt engineer. Generate a professional, highly detailed video prompt for ${platform || 'AI video generation'}. Output ONLY the prompt text in English, nothing else. No explanations, no labels. The prompt should describe the visual scene, camera movement, mood, lighting, and technical details for optimal AI video generation.`;

                let userRequest = `Video concept: ${concept}`;
                if (scene) userRequest += `\nScene description: ${scene}`;
                if (style) userRequest += `\nVideo style: ${style}`;
                if (movement) userRequest += `\nCamera movement: ${movement}`;
                if (mood) userRequest += `\nMood/tone: ${mood}`;
                if (lighting) userRequest += `\nLighting: ${lighting}`;
                if (duration) userRequest += `\nDuration: ${duration}`;
                if (extra) userRequest += `\nAdditional details: ${extra}`;

                aiPrompt = await generateWithGemini(systemPrompt, userRequest);
            }

            if (aiPrompt) {
                currentPrompt = aiPrompt.trim();
            } else {
                currentPrompt = buildVideoPrompt({ concept, scene, style, movement, mood, duration, lighting, extra, platform });
            }

            renderVideoOutput(currentPrompt, { style, movement, duration, platform, isAI: !!aiPrompt });
            copyBtn.disabled = false;
            saveBtn.disabled = false;
            generateBtn.classList.remove('loading');
            totalPrompts++;
            updateTotalPrompts();
            showToast('success', 'Prompt Dibuat!', aiPrompt ? 'AI-powered prompt generated ✨' : 'Template prompt generated.');
        });

        copyBtn.addEventListener('click', () => { if (currentPrompt) copyToClipboard(currentPrompt); });
        saveBtn.addEventListener('click', () => {
            if (currentPrompt) {
                saveToHistory('video', currentPrompt);
                showToast('success', 'Tersimpan!', 'Prompt disimpan ke History.');
            }
        });
    }

    function buildVideoPrompt({ concept, scene, style, movement, mood, duration, lighting, extra, platform }) {
        let parts = [concept];
        if (scene) parts.push(scene);
        if (style) parts.push(`${style} style`);
        if (movement) parts.push(`camera: ${movement}`);
        if (mood) parts.push(`${mood} mood`);
        if (lighting) parts.push(lighting);
        if (duration) parts.push(`duration: ${duration}`);
        if (extra) parts.push(extra);
        if (platform === 'sora') parts.push('cinematic quality, photorealistic');
        else if (platform === 'runway') parts.push('high quality, consistent motion');
        else if (platform === 'pika') parts.push('smooth animation, detailed');
        return parts.join(', ');
    }

    function renderVideoOutput(prompt, meta) {
        const outputArea = document.getElementById('videoOutput');
        let html = `<div class="output-content">`;

        html += `<div class="output-section">
            <div class="output-section-title"><i class="fas fa-sparkles"></i> VIDEO PROMPT</div>
            <div class="output-prompt">${escapeHtml(prompt)}<button class="output-prompt-copy" onclick="app.copyText(\`${escapeForJs(prompt)}\`)" title="Copy"><i class="fas fa-copy"></i></button></div>
        </div>`;

        let tags = [];
        if (meta.platform) tags.push(meta.platform.charAt(0).toUpperCase() + meta.platform.slice(1));
        if (meta.style) tags.push(meta.style);
        if (meta.duration) tags.push(meta.duration);
        if (meta.isAI) tags.push('✨ AI Generated');

        if (tags.length > 0) {
            html += `<div class="output-section">
                <div class="output-section-title"><i class="fas fa-tags"></i> TAGS</div>
                <div class="output-tags">${tags.map(t => `<span class="output-tag">${escapeHtml(t)}</span>`).join('')}</div>
            </div>`;
        }

        html += `</div>`;
        outputArea.innerHTML = html;
    }

    // ==========================================
    //  AFFILIATE VIDEO PROMPT GENERATOR
    // ==========================================
    function setupAffiliateGenerator() {
        const generateBtn = document.getElementById('generateAffiliatePrompt');
        const copyBtn = document.getElementById('copyAffiliatePrompt');
        const saveBtn = document.getElementById('saveAffiliatePrompt');
        let currentOutput = '';

        generateBtn.addEventListener('click', async () => {
            const product = document.getElementById('affProduct').value.trim();
            if (!product) {
                showToast('error', 'Nama Produk Diperlukan', 'Silakan isi nama produk.');
                document.getElementById('affProduct').focus();
                return;
            }

            generateBtn.classList.add('loading');

            const category = document.getElementById('affCategory').value;
            const benefit = document.getElementById('affBenefit').value.trim();
            const price = document.getElementById('affPrice').value.trim();
            const discount = document.getElementById('affDiscount').value.trim();
            const contentStyle = document.getElementById('affContentStyle').value;
            const tone = document.getElementById('affTone').value;
            const target = document.getElementById('affTarget').value;
            const platform = getActiveChipValue('affPlatformChips');
            const hook = document.getElementById('affHook').value;
            const duration = document.getElementById('affDuration').value;
            const cta = document.getElementById('affCta').value;
            const outputs = getActiveChipValues('affOutputChips');

            let aiResult = null;
            if (geminiApiKey && apiKeyVerified) {
                const systemPrompt = `Kamu adalah seorang expert copywriter dan content creator TikTok/Shopee affiliate Indonesia. Buatkan konten affiliate video dalam bahasa Indonesia yang viral dan menarik. FORMAT output harus terstruktur dengan section yang diminta.`;

                let userRequest = `Produk: ${product}`;
                if (category) userRequest += `\nKategori: ${category}`;
                if (benefit) userRequest += `\nKeunggulan: ${benefit}`;
                if (price) userRequest += `\nHarga: ${price}`;
                if (discount) userRequest += `\nDiskon: ${discount}`;
                if (contentStyle) userRequest += `\nTipe konten: ${contentStyle}`;
                if (tone) userRequest += `\nTone: ${tone}`;
                if (target) userRequest += `\nTarget audience: ${target}`;
                if (platform) userRequest += `\nPlatform: ${platform}`;
                if (hook) userRequest += `\nTipe hook: ${hook}`;
                userRequest += `\nDurasi: ${duration}`;
                userRequest += `\nCTA: ${cta}`;
                userRequest += `\n\nBuatkan: ${outputs.join(', ')}`;
                userRequest += `\n\nFormat output:\n`;
                if (outputs.includes('script')) userRequest += `- Section "📝 SCRIPT VIDEO" dengan format hook, konten, harga/promo, CTA\n`;
                if (outputs.includes('caption')) userRequest += `- Section "💬 CAPTION" untuk posting\n`;
                if (outputs.includes('hashtag')) userRequest += `- Section "🏷️ HASHTAG" (20 hashtag relevan)\n`;
                if (outputs.includes('hook-variations')) userRequest += `- Section "🎣 HOOK VARIATIONS" (5-8 variasi hook)\n`;

                aiResult = await generateWithGemini(systemPrompt, userRequest);
            }

            if (aiResult) {
                currentOutput = aiResult.trim();
                renderAffiliateOutputAI(currentOutput);
            } else {
                const output = buildAffiliateOutput({ product, category, benefit, price, discount, contentStyle, tone, target, platform, hook, duration, cta, outputs });
                currentOutput = output.fullText;
                renderAffiliateOutput(output);
            }

            copyBtn.disabled = false;
            saveBtn.disabled = false;
            generateBtn.classList.remove('loading');
            totalPrompts++;
            updateTotalPrompts();
            showToast('success', 'Script Dibuat!', aiResult ? 'AI-powered script generated ✨' : 'Template script generated.');
        });

        copyBtn.addEventListener('click', () => { if (currentOutput) copyToClipboard(currentOutput); });
        saveBtn.addEventListener('click', () => {
            if (currentOutput) {
                saveToHistory('affiliate', currentOutput);
                showToast('success', 'Tersimpan!', 'Script disimpan ke History.');
            }
        });
    }

    function renderAffiliateOutputAI(text) {
        const outputArea = document.getElementById('affiliateOutput');
        outputArea.innerHTML = `<div class="output-content">
            <div class="output-section">
                <div class="script-block">
                    <div class="script-label"><i class="fas fa-sparkles"></i> AI-GENERATED CONTENT</div>
                    <div class="script-content">${escapeHtml(text)}<button class="output-prompt-copy" onclick="app.copyText(\`${escapeForJs(text)}\`)" title="Copy"><i class="fas fa-copy"></i></button></div>
                </div>
            </div>
        </div>`;
    }

    function buildAffiliateOutput({ product, category, benefit, price, discount, contentStyle, tone, target, platform, hook, duration, cta, outputs }) {
        const result = { sections: [], fullText: '' };
        const hookText = generateHook(product, hook, benefit, price, discount);

        if (outputs.includes('script')) {
            result.sections.push({ label: '📝 Script Video', icon: 'fa-scroll', content: generateScript({ product, benefit, price, discount, contentStyle, tone, hookText, duration, cta }), type: 'script' });
        }
        if (outputs.includes('caption')) {
            result.sections.push({ label: '💬 Caption', icon: 'fa-message', content: generateCaption({ product, benefit, price, discount, cta }), type: 'caption' });
        }
        if (outputs.includes('hashtag')) {
            result.sections.push({ label: '🏷️ Hashtag', icon: 'fa-hashtag', content: generateHashtags(product, category, platform), type: 'hashtag' });
        }
        if (outputs.includes('hook-variations')) {
            result.sections.push({ label: '🎣 Hook Variations', icon: 'fa-fish', content: generateHookVariations(product, benefit, price, discount), type: 'hooks' });
        }

        result.fullText = result.sections.map(s => `=== ${s.label} ===\n${s.content}`).join('\n\n');
        return result;
    }

    function generateHook(product, hookType, benefit, price, discount) {
        const hooks = {
            'question': [`Kamu masih belum tau ${product} ini? 😱`, `Kenapa semua orang rebutan ${product} ini?`],
            'shocking-fact': [`99% orang gak tau kalau ${product} ini punya kelebihan ini!`, `TERNYATA ${product} ini bisa bikin kamu kaget! 😳`],
            'problem': [`Bosan dengan masalah ini? Ini solusinya!`, `STOP! Jangan buang uangmu sebelum tau ini!`],
            'transformation': [`Before ➡️ After pakai ${product}... WOW! ✨`, `Transformasi gila setelah pakai ${product}! 🤯`],
            'trending': [`${product} lagi VIRAL banget di TikTok! 🔥`, `FYP terus ${product} ini, akhirnya aku coba!`],
            'fomo': [`TINGGAL SEDIKIT! ${product} hampir habis! ⏰`, `Last call! Promo ${product} ${discount || ''} cuma hari ini!`]
        };
        const opts = hooks[hookType] || hooks['question'];
        return opts[Math.floor(Math.random() * opts.length)];
    }

    function generateScript({ product, benefit, price, discount, contentStyle, tone, hookText, duration, cta }) {
        let s = `🎬 [HOOK - 0-3 Detik]\n"${hookText}"\n\n`;
        s += `📖 [KONTEN - ${duration === '15-30 detik' ? '3-25' : duration === '30-60 detik' ? '3-50' : '3-150'} Detik]\n`;

        if (contentStyle === 'unboxing') {
            s += `"Akhirnya datang juga ${product}! Yuk kita unboxing bareng~"\n[Buka packaging perlahan]\n`;
        } else if (contentStyle === 'tutorial') {
            s += `"Cara pakai ${product} gampang banget:"\nStep 1: [Langkah pertama]\nStep 2: [Langkah kedua]\nStep 3: [Hasil akhir]\n`;
        } else if (contentStyle === 'before-after') {
            s += `"BEFORE ➡️ AFTER pakai ${product}"\n[Tunjukkan BEFORE]\n[Transisi dramatic ke AFTER]\n`;
        } else {
            s += `"Guys, ini ${product} yang lagi viral banget!"\n[Tunjukkan detail produk]\n`;
        }

        if (benefit) s += `"${benefit}"\n`;
        s += `\n💰 [HARGA & PROMO]\n`;
        if (price) s += `"Harganya? ${price} aja!"\n`;
        if (discount) s += `"DAN sekarang lagi ada ${discount}! 🔥"\n`;
        s += `\n📢 [CTA]\n"Langsung aja ${cta}!"\n"Sebelum kehabisan ya! 🏃‍♀️"\n`;
        return s;
    }

    function generateCaption({ product, benefit, price, discount, cta }) {
        let c = `✨ ${product} ✨\n\n`;
        if (benefit) c += `✅ ${benefit}\n`;
        if (price) c += `💰 Harga: ${price}\n`;
        if (discount) c += `🏷️ ${discount}\n`;
        c += `\n🛒 ${cta || 'Klik link di bio'}!\n📌 Follow untuk info promo menarik!\n`;
        return c;
    }

    function generateHashtags(product, category, platform) {
        const base = ['#fyp', '#foryou', '#viral', '#trending', '#rekomendasi'];
        const cat = { 'skincare': ['#skincare', '#glowingskin', '#beauty'], 'fashion': ['#fashion', '#ootd', '#style'], 'elektronik': ['#gadget', '#techreview', '#unboxing'], 'makanan': ['#kuliner', '#foodtiktok', '#jajanantiktok'] };
        const plat = { 'tiktok': ['#tiktok', '#tiktokindonesia', '#tiktokshop'], 'shopee': ['#shopee', '#shopeehaul', '#shopeefinds'] };
        let tags = [...base, ...(cat[category] || []), ...(plat[platform] || [])];
        tags.push('#' + product.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''));
        return [...new Set(tags)].slice(0, 20).join(' ');
    }

    function generateHookVariations(product, benefit, price, discount) {
        return [
            `"STOP SCROLL! ${product} ini bakal ubah hidupmu! 🤯"`,
            `"POV: kamu nemuin ${product} yang ternyata worth it banget"`,
            `"Produk ${price || 'murah'} tapi kualitas jutaan? 🔥"`,
            `"Jangan bilang kamu belum tau ${product} ini..."`,
            `"${product} honest review - no sugar coating! 💯"`,
            `"3 alasan kenapa kamu HARUS coba ${product} ini!"`,
            `"Viral bukan tanpa alasan! ${product} review!"`,
            benefit ? `"Mau ${benefit}? Cobain ini deh!"` : `"Cobain ini, gak bakal nyesel!"`,
        ].map((v, i) => `${i + 1}. ${v}`).join('\n');
    }

    function renderAffiliateOutput(output) {
        const outputArea = document.getElementById('affiliateOutput');
        let html = `<div class="output-content">`;
        output.sections.forEach(section => {
            html += `<div class="output-section"><div class="script-block">
                <div class="script-label"><i class="fas ${section.icon}"></i> ${section.label}</div>
                <div class="script-content">${escapeHtml(section.content)}<button class="output-prompt-copy" onclick="app.copyText(\`${escapeForJs(section.content)}\`)" title="Copy"><i class="fas fa-copy"></i></button></div>
            </div></div>`;
        });
        html += `</div>`;
        outputArea.innerHTML = html;
    }

    // ==========================================
    //  HISTORY PAGE
    // ==========================================
    function setupHistoryPage() {
        document.getElementById('clearHistory').addEventListener('click', () => {
            if (confirm('Hapus semua history?')) {
                history = [];
                localStorage.setItem('promptcraft_history', JSON.stringify(history));
                renderHistory();
                showToast('info', 'History Dihapus', 'Semua history telah dibersihkan.');
            }
        });

        document.querySelectorAll('.history-filters .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.history-filters .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderHistory(chip.dataset.filter);
            });
        });
    }

    function renderHistory(filter = 'all') {
        const listEl = document.getElementById('historyList');
        let items = filter === 'all' ? history : history.filter(item => item.type === filter);

        if (items.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-inbox"></i></div><h3>Belum Ada History</h3><p>Prompt yang Anda buat dan simpan akan muncul di sini.</p></div>`;
            return;
        }

        listEl.innerHTML = items.map((item, index) => `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-type-badge ${item.type}">${item.type === 'image' ? '🖼️ Image' : item.type === 'video' ? '🎬 Video' : '🛍️ Affiliate'}</span>
                    <span class="history-date">${formatDate(item.date)}</span>
                </div>
                <div class="history-item-preview">${escapeHtml(item.prompt)}</div>
                <div class="history-item-actions">
                    <button class="btn-icon" onclick="app.copyText(\`${escapeForJs(item.prompt)}\`)" title="Copy"><i class="fas fa-copy"></i></button>
                    <button class="btn-icon" onclick="app.deleteHistory(${history.indexOf(item)})" title="Delete" style="border-color: rgba(239,68,68,0.2);"><i class="fas fa-trash" style="color: var(--accent-red);"></i></button>
                </div>
            </div>
        `).join('');
    }

    function saveToHistory(type, prompt) {
        history.unshift({ type, prompt, date: new Date().toISOString() });
        if (history.length > 100) history = history.slice(0, 100);
        localStorage.setItem('promptcraft_history', JSON.stringify(history));
    }

    function deleteHistory(index) {
        history.splice(index, 1);
        localStorage.setItem('promptcraft_history', JSON.stringify(history));
        renderHistory();
        showToast('info', 'Dihapus', 'Item history telah dihapus.');
    }

    // ==========================================
    //  RECENT ACTIVITY (Dashboard)
    // ==========================================
    function renderRecentActivity() {
        const container = document.getElementById('recentActivityList');
        const recent = history.slice(0, 8);

        if (recent.length === 0) {
            container.innerHTML = `<div class="empty-state-sm"><i class="fas fa-inbox"></i><p>No recent activity yet</p></div>`;
            return;
        }

        container.innerHTML = recent.map(item => `
            <div class="activity-item">
                <div class="activity-type-dot ${item.type}"></div>
                <div class="activity-info">
                    <p>${escapeHtml(item.prompt.substring(0, 80))}${item.prompt.length > 80 ? '...' : ''}</p>
                    <span>${formatDate(item.date)}</span>
                </div>
            </div>
        `).join('');
    }

    // ==========================================
    //  TEMPLATES PAGE
    // ==========================================
    const templates = [
        { type: 'image', name: 'Portrait Cinematic', description: 'Portrait profesional dengan gaya sinematik.', prompt: 'A beautiful portrait of a young woman, cinematic style, dramatic lighting, golden hour, bokeh background, highly detailed, 8K resolution --ar 3:2 --v 6.1', icon: '📷' },
        { type: 'image', name: 'Fantasy Landscape', description: 'Pemandangan fantasi epik dengan detail tinggi.', prompt: 'Epic fantasy landscape with floating islands, magical aurora, crystal waterfalls, digital art style, vibrant colors, volumetric lighting, 4K --ar 16:9 --v 6.1', icon: '🏔️' },
        { type: 'image', name: 'Product Photography', description: 'Foto produk profesional untuk e-commerce.', prompt: 'Professional product photography, clean white background, soft studio lighting, minimalist, high-end commercial quality, ultra HD 8K --ar 1:1', icon: '📦' },
        { type: 'image', name: 'Anime Character', description: 'Karakter anime detail dengan warna vibrant.', prompt: 'Beautiful anime character, detailed face and eyes, vibrant colors, dynamic pose, cherry blossom background, masterpiece quality --ar 3:4', icon: '🎌' },
        { type: 'video', name: 'Cinematic Nature', description: 'Video alam sinematik dengan gerakan halus.', prompt: 'Cinematic aerial shot of vast mountain range at golden hour, smooth drone movement, epic mood, natural daylight, slow motion, 10 seconds', icon: '🌄' },
        { type: 'video', name: 'Urban Timelapse', description: 'Timelapse kota modern dengan neon malam.', prompt: 'Urban city timelapse, neon city lights, futuristic mood, pan across skyline, night to dawn, 15 seconds, cinematic quality', icon: '🌃' },
        { type: 'affiliate', name: 'Skincare Review', description: 'Template review skincare TikTok affiliate.', prompt: '📝 SCRIPT:\n🎬 [HOOK] "Skincare viral ini beneran works? 🤔"\n📖 [KONTEN] "Udah coba 2 minggu... GLOWING!"\n💰 [PROMO] "Worth it banget!"\n📢 [CTA] "Klik keranjang kuning!"', icon: '💆' },
        { type: 'affiliate', name: 'Gadget Unboxing', description: 'Template unboxing gadget affiliate.', prompt: '📝 SCRIPT:\n🎬 [HOOK] "AKHIRNYA gadget ini datang! 📦"\n📖 [KONTEN] "Packaging premium! Fitur lengkap!"\n💰 [PROMO] "Diskon spesial!"\n📢 [CTA] "Link ada di bio!"', icon: '📱' },
        { type: 'image', name: 'Cyberpunk City', description: 'Kota cyberpunk futuristik dengan neon.', prompt: 'Futuristic cyberpunk city at night, neon lights on wet streets, flying cars, holographic ads, rain, ultra HD 8K --ar 21:9 --v 6.1', icon: '🤖' },
    ];

    function setupTemplatesPage() { renderTemplates(); }

    function renderTemplates() {
        const grid = document.getElementById('templatesGrid');
        grid.innerHTML = templates.map((tmpl, i) => `
            <div class="template-card">
                <div class="template-header">
                    <div class="template-icon ${tmpl.type}">${tmpl.icon}</div>
                    <div><div class="template-name">${tmpl.name}</div><div class="template-type">${tmpl.type === 'image' ? '🖼️ Image' : tmpl.type === 'video' ? '🎬 Video' : '🛍️ Affiliate'}</div></div>
                </div>
                <div class="template-description">${tmpl.description}</div>
                <div class="template-preview">${escapeHtml(tmpl.prompt)}</div>
                <div class="template-footer">
                    <button class="template-use-btn" onclick="app.useTemplate(${i})"><i class="fas fa-copy"></i> Gunakan</button>
                </div>
            </div>
        `).join('');
    }

    function useTemplate(index) {
        const tmpl = templates[index];
        copyToClipboard(tmpl.prompt);
        showToast('success', 'Template Disalin!', `"${tmpl.name}" disalin ke clipboard.`);
    }

    // ==========================================
    //  SETTINGS PAGE
    // ==========================================
    function setupSettingsPage() {
        const apiKeyInput = document.getElementById('geminiApiKey');
        const toggleBtn = document.getElementById('toggleApiKeyVisibility');
        const verifyBtn = document.getElementById('verifyApiKey');
        const removeBtn = document.getElementById('removeApiKey');
        const saveProfileBtn = document.getElementById('saveProfile');

        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
        });

        // Verify & Save
        verifyBtn.addEventListener('click', async () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                showToast('error', 'API Key Kosong', 'Silakan masukkan API key terlebih dahulu.');
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

            const isValid = await verifyApiKey(key);

            if (isValid) {
                geminiApiKey = key;
                apiKeyVerified = true;
                localStorage.setItem('promptcraft_gemini_key', key);
                localStorage.setItem('promptcraft_api_verified', 'true');
                updateApiStatus();
                updateSettingsStatus(true);
                removeBtn.style.display = 'inline-flex';
                showToast('success', 'API Key Valid!', 'Gemini API key berhasil diverifikasi dan disimpan.');
            } else {
                updateSettingsStatus(false);
                showToast('error', 'API Key Tidak Valid', 'Pastikan API key Anda benar. Dapatkan di aistudio.google.com');
            }

            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify & Save';
        });

        // Remove
        removeBtn.addEventListener('click', () => {
            geminiApiKey = '';
            apiKeyVerified = false;
            localStorage.removeItem('promptcraft_gemini_key');
            localStorage.removeItem('promptcraft_api_verified');
            apiKeyInput.value = '';
            updateApiStatus();
            updateSettingsStatus(null);
            removeBtn.style.display = 'none';
            showToast('info', 'API Key Dihapus', 'API key telah dihapus.');
        });

        // Save Profile
        saveProfileBtn.addEventListener('click', () => {
            const name = document.getElementById('settingsName').value.trim();
            if (name) {
                userName = name;
                localStorage.setItem('promptcraft_name', name);
                updateUserProfile();
                showToast('success', 'Profile Disimpan!', `Nama diubah menjadi "${name}".`);
            }
        });
    }

    function loadSettings() {
        document.getElementById('geminiApiKey').value = geminiApiKey;
        document.getElementById('settingsName').value = userName;
        document.getElementById('removeApiKey').style.display = geminiApiKey ? 'inline-flex' : 'none';

        if (geminiApiKey && apiKeyVerified) {
            updateSettingsStatus(true);
        } else if (geminiApiKey) {
            updateSettingsStatus(false);
        } else {
            updateSettingsStatus(null);
        }
    }

    function updateSettingsStatus(status) {
        const indicator = document.getElementById('apiKeyStatusIndicator');
        const text = document.getElementById('apiKeyStatusText');

        if (status === true) {
            indicator.className = 'api-key-status-indicator online';
            text.textContent = '✓ API key verified and active';
        } else if (status === false) {
            indicator.className = 'api-key-status-indicator offline';
            text.textContent = '✗ API key verification failed';
        } else {
            indicator.className = 'api-key-status-indicator offline';
            text.textContent = 'No API key configured';
        }
    }

    // ==========================================
    //  UTILITY FUNCTIONS
    // ==========================================
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(showCopyFeedback).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showCopyFeedback();
        });
    }

    function showCopyFeedback() {
        copyFeedback.classList.add('show');
        setTimeout(() => copyFeedback.classList.remove('show'), 1500);
    }

    function showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
        toast.innerHTML = `<div class="toast-icon"><i class="fas ${icons[type] || 'fa-info'}"></i></div><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.closest('.toast').remove()"><i class="fas fa-xmark"></i></button>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
    }

    function updateTotalPrompts() {
        totalPromptsEl.textContent = totalPrompts;
        localStorage.setItem('promptcraft_total', totalPrompts.toString());
    }

    function formatDate(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h lalu`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d lalu`;
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    function escapeForJs(str) {
        return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/\n/g, '\\n');
    }

    // ==========================================
    //  AI CHAT ASSISTANT
    // ==========================================
    function setupChatAssistant() {
        const chatWidget = document.getElementById('aiChatWidget');
        const chatToggle = document.getElementById('aiChatToggle');
        const chatClose = document.getElementById('aiChatClose');
        const chatContainer = document.getElementById('aiChatContainer');
        const chatMessages = document.getElementById('aiChatMessages');
        const chatInput = document.getElementById('aiChatMessageInput');
        const chatSend = document.getElementById('aiChatSend');

        let chatHistory = [];

        // Toggle chat
        chatToggle.addEventListener('click', () => {
            chatWidget.classList.toggle('active');
            if (chatWidget.classList.contains('active')) {
                chatInput.focus();
                scrollToBottom();
            }
        });

        chatClose.addEventListener('click', () => {
            chatWidget.classList.remove('active');
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });

        // Send on Enter
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        chatSend.addEventListener('click', sendMessage);

        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            if (!geminiApiKey || !apiKeyVerified) {
                showToast('error', 'API Key Belum Siap', 'Silakan hubungkan API key di Settings untuk mengaktifkan Chat AI.');
                return;
            }

            // Clear input
            chatInput.value = '';
            chatInput.style.height = 'auto';

            // Add user message to UI
            appendMessage('user', message);
            chatHistory.push({ role: 'user', content: message });

            // Show typing indicator
            const typingId = showTypingIndicator();
            scrollToBottom();

            try {
                const systemPrompt = `You are a helpful AI assistant for PromptCraft Studio. Your goal is to help users create better AI prompts for images, videos, and affiliate content. Be professional, creative, and concise. You have context about their stored API key and current activity.`;
                
                const response = await generateWithGemini(systemPrompt, `User message: ${message}\n\nChat context: ${JSON.stringify(chatHistory.slice(-5))}`);
                
                // Remove typing indicator
                removeTypingIndicator(typingId);

                if (response) {
                    appendMessage('bot', response);
                    chatHistory.push({ role: 'bot', content: response });
                } else {
                    appendMessage('bot', 'Maaf, saya sedang mengalami gangguan koneksi ke server Gemini. Mohon coba lagi nanti.');
                }
            } catch (error) {
                removeTypingIndicator(typingId);
                appendMessage('bot', 'Ups, terjadi kesalahan saat menghubungi server.');
                console.error('Chat error:', error);
            }

            scrollToBottom();
        }

        function appendMessage(role, text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${role}`;
            msgDiv.innerText = text;
            chatMessages.appendChild(msgDiv);
        }

        function showTypingIndicator() {
            const id = 'typing-' + Date.now();
            const indicator = document.createElement('div');
            indicator.id = id;
            indicator.className = 'typing-indicator';
            indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
            chatMessages.appendChild(indicator);
            return id;
        }

        function removeTypingIndicator(id) {
            const indicator = document.getElementById(id);
            if (indicator) indicator.remove();
        }

        function scrollToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Update active status icon based on API connection
        const updateChatStatus = () => {
            if (apiKeyVerified) {
                chatWidget.classList.add('api-online');
            } else {
                chatWidget.classList.remove('api-online');
            }
        };

        // Check status periodically or when API key is verified
        setInterval(updateChatStatus, 5000);
        updateChatStatus();
    }

    // ==========================================
    //  PUBLIC API
    // ==========================================
    window.app = {
        copyText: copyToClipboard,
        deleteHistory: deleteHistory,
        useTemplate: useTemplate,
        navigateTo: navigateTo
    };

    // ==========================================
    //  BOOT
    // ==========================================
    document.addEventListener('DOMContentLoaded', init);
})();
