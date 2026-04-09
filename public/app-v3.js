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
    //  STATE (Synced with Backend)
    // ==========================================
    let history = [];
    let totalPrompts = 0;
    let userName = 'User';
    let displayName = 'User';
    let geminiApiKey = '';
    let freepikApiKey = '';
    let leonardoApiKey = '';
    let openaiApiKey = '';
    let apiKeyVerified = false;
    let currentUser = null;

    async function init() {
        const authed = await checkSession();
        if (!authed) return;

        await loadUserData();
        setupSidebar();
        setupNavigation();
        setupChipGroups();
        setupToolCards();
        setupImageGenerator();
        setupAffiliateGenerator();
        setupHistoryPage();
        setupTemplatesPage();
        setupSettingsPage();
        setupChatAssistant();
        setupAiEngine();
        setupLogout();
    }

    async function checkSession() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                userName = currentUser.username;
                displayName = currentUser.display_name;
                geminiApiKey = currentUser.gemini_api_key || '';
                freepikApiKey = currentUser.freepik_api_key || '';
                leonardoApiKey = currentUser.leonardo_api_key || '';
                openaiApiKey = currentUser.openai_api_key || '';

                // Show admin nav if applicable
                const adminNav = document.getElementById('nav-admin');
                if (adminNav && currentUser.role === 'admin') {
                    adminNav.style.display = 'flex';
                }

                return true;
            } else {
                window.location.href = 'login.html';
                return false;
            }
        } catch (e) {
            window.location.href = 'login.html';
            return false;
        }
    }

    async function loadUserData() {
        try {
            // Load History
            const resHist = await fetch('/api/history');
            const dataHist = await resHist.json();
            history = dataHist.history || [];

            // Re-verify API key if it exists
            if (geminiApiKey) {
                apiKeyVerified = await verifyApiKey(geminiApiKey);
            }

            updateTotalPrompts();
            updateUserProfile();
            updateApiStatus();
            renderRecentActivity();
        } catch (e) {
            console.error('Failed to load user data:', e);
        }
    }

    // ==========================================
    //  UTILITIES
    // ==========================================
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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

        // Submenu toggles
        document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggle.closest('.nav-group').classList.toggle('open');
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

        // Update Breadcrumb Title
        const breadcrumbEl = document.getElementById('globalBreadcrumb');
        if (breadcrumbEl) {
            const pageTitles = {
                'dashboard': 'Dashboard',
                'image': 'Image Prompt Generator',
                'video': 'Video Prompt Generator',
                'affiliate': 'Affiliate Video',
                'ai-image': 'AI Image Engine',
                'ai-video': 'AI Video Engine',
                'history': 'Activity History',
                'templates': 'Templates',
                'settings': 'Settings',
                'admin': 'Admin Panel'
            };
            const icons = {
                'dashboard': 'fa-th-large',
                'image': 'fa-image',
                'video': 'fa-video',
                'affiliate': 'fa-bag-shopping',
                'ai-image': 'fa-robot',
                'ai-video': 'fa-clapperboard',
                'history': 'fa-clock-rotate-left',
                'templates': 'fa-layer-group',
                'settings': 'fa-gear',
                'admin': 'fa-user-shield'
            };
            const title = pageTitles[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
            const icon = icons[pageName] || 'fa-layer-group';
            breadcrumbEl.innerHTML = `<i class="fas ${icon}"></i> ${title}`;
        }

        if (pageName === 'history') renderHistory();
        if (pageName === 'templates') renderTemplates();
        if (pageName === 'dashboard') renderRecentActivity();
        if (pageName === 'settings') loadSettings();
        if (pageName === 'admin') loadAdminData();
        if (pageName === 'ai-image' && window._aiEngine) window._aiEngine.onPageLoad();

        // Auto-expand parent nav-group when sub-item is active
        const promptGenGroup = document.getElementById('navGroupPromptGen');
        if (promptGenGroup) {
            if (['image', 'video', 'affiliate'].includes(pageName)) {
                promptGenGroup.classList.add('open');
            }
        }
        const aiGroup = document.getElementById('navGroupAiEngine');
        if (aiGroup) {
            if (['ai-image', 'ai-video'].includes(pageName)) {
                aiGroup.classList.add('open');
            }
        }

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
        document.getElementById('userName').textContent = displayName || userName;
        document.getElementById('welcomeName').textContent = displayName || userName;
        document.getElementById('userAvatar').textContent = (displayName || userName).charAt(0).toUpperCase();
    }

    function setupLogout() {
        const logoutBtn = document.createElement('div');
        logoutBtn.className = 'nav-item';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Sign Out</span>';
        logoutBtn.style.marginTop = 'auto';
        logoutBtn.style.borderTop = '1px solid var(--border)';
        logoutBtn.style.paddingTop = '15px';
        logoutBtn.onclick = async () => {
            if (confirm('Keluar dari sesi?')) {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = 'login.html';
            }
        };
        const nav = document.querySelector('.sidebar-nav');
        if (nav) nav.appendChild(logoutBtn);
    }

    function updateApiStatus() {
        const icon = document.getElementById('apiStatusIcon');
        const text = document.getElementById('apiStatusText');
        const btn = document.getElementById('apiSetupBtn');
        const indicator = document.getElementById('apiIndicator');
        const mobileApiDot = document.getElementById('mobileApiDot');

        if (geminiApiKey && apiKeyVerified) {
            if (icon) {
                icon.classList.add('connected');
                icon.innerHTML = '<i class="fas fa-check-circle"></i>';
            }
            if (text) {
                text.textContent = 'API key connected — AI-powered generation active';
                text.style.color = '#10b981';
            }
            if (btn) btn.innerHTML = '<i class="fas fa-gear"></i> Manage';
            if (indicator) indicator.innerHTML = '<span class="api-dot online"></span><span class="api-text">Online</span>';
            if (mobileApiDot) mobileApiDot.innerHTML = '<span class="api-dot online"></span>';
        } else {
            if (icon) {
                icon.classList.remove('connected');
                icon.innerHTML = '<i class="fas fa-key"></i>';
            }
            if (text) {
                text.textContent = 'No API key configured';
                text.style.color = '';
            }
            if (btn) btn.innerHTML = '<i class="fas fa-key"></i> Set API Key';
            if (indicator) indicator.innerHTML = '<span class="api-dot offline"></span><span class="api-text">Offline</span>';
            if (mobileApiDot) mobileApiDot.innerHTML = '<span class="api-dot offline"></span>';
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
            showToast('info', 'Pemberitahuan', 'Fitur hapus massal akan segera hadir di dashboard cloud Anda.');
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
        const mediaGridEl = document.getElementById('historyMediaGrid');

        let items = filter === 'all' ? history : history.filter(item => item.type === filter);

        const mediaItems = items.filter(item => item.result_text && item.result_text.startsWith('http'));
        const textItems = items.filter(item => !item.result_text || !item.result_text.startsWith('http'));

        // Render Media Grid
        if (mediaItems.length === 0) {
            mediaGridEl.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-icon"><i class="fas fa-image"></i></div><h3>Belum Ada Media Generated</h3><p>Hasil generate Image & Video akan muncul di sini.</p></div>`;
        } else {
            mediaGridEl.innerHTML = mediaItems.map((item, index) => {
                const isVideo = item.result_text.endsWith('.mp4') || item.type === 'video';
                const mediaTag = isVideo
                    ? `<video src="${item.result_text}#t=0.1" preload="metadata" class="dash-card-img" style="object-fit:cover; pointer-events:none;"></video>`
                    : `<img src="${item.result_text}" class="dash-card-img" alt="Generated Image">`;

                return `
                <div class="dash-card" style="height: 250px;" onclick="window.open('${item.result_text}', '_blank')">
                    <div class="dash-card-badge type-${item.type}">${item.type === 'video' ? 'Video' : 'Image'}</div>
                    ${mediaTag}
                    ${isVideo ? '<div class="dash-card-play"><i class="fas fa-play"></i></div>' : ''}
                </div>`;
            }).join('');
        }

        // Render Text List
        if (textItems.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-quote-right"></i></div><h3>Belum Ada Prompt Text</h3><p>Prompt yang Anda buat dan simpan akan muncul di sini.</p></div>`;
        } else {
            listEl.innerHTML = textItems.map((item, index) => `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-type-badge ${item.type}">${item.type === 'image' ? '🖼️ Image Prompt' : item.type === 'video' ? '🎬 Video Prompt' : '🛍️ Affiliate Prompt'}</span>
                        <span class="history-date">${formatDate(item.created_at || new Date())}</span>
                    </div>
                    <div class="history-item-preview">${escapeHtml(item.prompt_text)}</div>
                    <div class="history-item-actions">
                        <button class="btn-icon" onclick="app.copyText(\`${escapeForJs(item.prompt_text)}\`)" title="Copy"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    async function saveToHistory(type, prompt, platform = '') {
        try {
            const res = await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    prompt_text: prompt,
                    platform,
                    metadata: { saved: true }
                })
            });
            if (res.ok) {
                // Refresh local history state
                const resHist = await fetch('/api/history');
                const dataHist = await resHist.json();
                history = dataHist.history || [];
                renderRecentActivity();
            }
        } catch (e) {
            console.error('Failed to sync history to cloud:', e);
        }
    }

    // ==========================================
    //  RECENT ACTIVITY (Dashboard)
    // ==========================================
    function renderRecentActivity() {
        // Updated to use the new dashboard UI grid class
        const container = document.querySelector('.recent-grid');
        if (!container) return; // Prevent error if not on a page that has this

        const recent = history.slice(0, 8);

        if (recent.length === 0) {
            container.innerHTML = `<div class="dash-card"><div style="padding: 20px; color: var(--text-secondary); text-align: center; width: 100%;">Belum ada karya terbaru.</div></div>`;
            return;
        }

        container.innerHTML = recent.map(item => {
            // Determine badge and dummy image/icon based on type
            let badgeType = item.type === 'video' ? 'type-video' : (item.type === 'image' ? 'type-workflow' : 'type-prompt');
            let iconOrImage = '';

            const realUrl = item.video_url || item.result_text;
            if (item.type === 'video' && realUrl && realUrl.startsWith('http')) {
                // If it's a real video, show non-looping poster using #t=0.1
                iconOrImage = `<video src="${realUrl}#t=0.1" preload="metadata" class="dash-card-img" style="object-fit: cover; opacity: 0.8; pointer-events: none;"></video>
                               <div class="dash-card-play"><i class="fas fa-play"></i></div>`;
            } else if (item.type === 'image' && realUrl && realUrl.startsWith('http')) {
                iconOrImage = `<img src="${realUrl}" class="dash-card-img" style="object-fit: cover; opacity: 0.8;">`;
            } else if (item.type === 'image') {
                iconOrImage = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#111;"><i class="fas fa-image" style="font-size:2rem; color:#10b981;"></i></div>`;
            } else {
                iconOrImage = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#111;"><i class="fas fa-file-alt" style="font-size:2rem; color:#8b5cf6;"></i></div>`;
            }

            return `
            <div class="dash-card">
                <div class="dash-card-badge ${badgeType}">${item.type.toUpperCase()}</div>
                ${iconOrImage}
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; padding: 10px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); color: #fff; font-size: 0.7rem;">
                    ${escapeHtml(item.prompt_text.substring(0, 40))}${item.prompt_text.length > 40 ? '...' : ''}
                </div>
            </div>`;
        }).join('');
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

                // Sync to Cloud
                await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gemini_api_key: key })
                });

                updateApiStatus();
                updateSettingsStatus(true);
                removeBtn.style.display = 'inline-flex';
                showToast('success', 'API Key Valid!', 'Gemini API key berhasil diverifikasi dan disinkronkan ke cloud.');
            } else {
                updateSettingsStatus(false);
                showToast('error', 'API Key Tidak Valid', 'Pastikan API key Anda benar. Dapatkan di aistudio.google.com');
            }

            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verify & Save';
        });

        // Remove
        removeBtn.addEventListener('click', async () => {
            if (!confirm('Hapus API key dari cloud?')) return;

            geminiApiKey = '';
            apiKeyVerified = false;

            await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gemini_api_key: '' })
            });

            apiKeyInput.value = '';
            updateApiStatus();
            updateSettingsStatus(null);
            removeBtn.style.display = 'none';
            showToast('info', 'API Key Dihapus', 'API key telah dihapus dari profil cloud Anda.');
        });

        // Save Profile
        saveProfileBtn.addEventListener('click', async () => {
            const name = document.getElementById('settingsName').value.trim();
            if (name) {
                saveProfileBtn.disabled = true;
                saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_name: name })
                });

                displayName = name;
                updateUserProfile();
                saveProfileBtn.disabled = false;
                saveProfileBtn.innerHTML = 'Save Changes';
                showToast('success', 'Profile Disimpan!', `Nama diubah menjadi "${name}" di database cloud.`);
            }
        });

        // Generic Save Key Listeners
        document.querySelectorAll('.save-specific-key').forEach(btn => {
            btn.addEventListener('click', async () => {
                const keyName = btn.dataset.key; // e.g., freepik_api_key
                const inputId = btn.dataset.input; // e.g., freepikApiKey
                const val = document.getElementById(inputId).value.trim();

                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                try {
                    const res = await fetch('/api/user/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [keyName]: val })
                    });

                    if (res.ok) {
                        showToast('success', 'API Key Disimpan', `Key untuk ${keyName.split('_')[0]} berhasil diperbarui.`);
                    } else {
                        showToast('error', 'Gagal', 'Terjadi kesalahan saat menyimpan key.');
                    }
                } catch (e) {
                    showToast('error', 'Error', 'Gagal menghubungi server.');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        });

        // Generic Toggle Visibility
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
            });
        });
    }

    function loadSettings() {
        if (document.getElementById('geminiApiKey')) document.getElementById('geminiApiKey').value = geminiApiKey;
        if (document.getElementById('freepikApiKey')) document.getElementById('freepikApiKey').value = freepikApiKey;
        if (document.getElementById('leonardoApiKey')) document.getElementById('leonardoApiKey').value = leonardoApiKey;
        if (document.getElementById('openaiApiKey')) document.getElementById('openaiApiKey').value = openaiApiKey;

        if (document.getElementById('settingsName')) {
            document.getElementById('settingsName').value = displayName || userName;
        }

        const removeGeminiBtn = document.getElementById('removeApiKey');
        if (removeGeminiBtn) {
            removeGeminiBtn.style.display = geminiApiKey ? 'inline-flex' : 'none';
        }

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
    //  ADMIN DASHBOARD LOGIC
    // ==========================================
    async function loadAdminData() {
        if (!currentUser || currentUser.role !== 'admin') return;

        try {
            const [resStats, resUsers, resInvites] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/users'),
                fetch('/api/admin/invites')
            ]);
            const dataStats = await resStats.json();
            const dataUsers = await resUsers.json();
            const dataInvites = await resInvites.json();

            renderAdminDashboard(dataStats.stats, dataUsers.users, dataInvites.invites || []);
        } catch (e) {
            showToast('error', 'Admin Error', 'Gagal memuat data admin.');
        }
    }

    function renderAdminDashboard(stats, users, invites) {
        document.getElementById('adminTotalUsers').textContent = stats.totalUsers;
        document.getElementById('adminTotalPrompts').textContent = stats.totalPrompts;
        const totalInvitesEl = document.getElementById('adminTotalInvites');
        if (totalInvitesEl) totalInvitesEl.textContent = invites.length;

        // Render Users
        const tableBody = document.getElementById('adminUserList');
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 24px;">Belum ada user terdaftar</td></tr>`;
        } else {
            tableBody.innerHTML = users.map(user => `
                <tr>
                    <td>
                        <div class="admin-user-info">
                            <div class="admin-user-avatar">${(user.display_name || user.username || '?').charAt(0).toUpperCase()}</div>
                            <div>
                                <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(user.display_name || user.username)}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">@${escapeHtml(user.username || '-')}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="admin-badge ${user.role}">${user.role.toUpperCase()}</span></td>
                    <td><span style="font-weight: 700;">${user.prompt_count}</span> Prompts</td>
                    <td><div style="font-size: 12px; color: var(--text-secondary);">${formatDate(user.created_at)}</div></td>
                    <td>
                        <div class="table-actions">
                            ${user.id !== currentUser.id ? `
                                <button class="btn-icon" onclick="app.deleteUser(${user.id})" title="Delete User" style="border-color: rgba(239,68,68,0.2);">
                                    <i class="fas fa-trash-can" style="color: var(--accent-red);"></i>
                                </button>
                            ` : '<span style="font-size: 11px; color: var(--text-muted);">Self</span>'}
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Render Invites
        const inviteBody = document.getElementById('adminInviteList');
        if (!inviteBody) return;
        if (invites.length === 0) {
            inviteBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 24px;">Belum ada undangan dikirim</td></tr>`;
        } else {
            inviteBody.innerHTML = invites.map(inv => {
                const isExpired = new Date(inv.token_expires) < new Date() && inv.status === 'pending';
                const badgeClass = inv.status === 'completed' ? 'completed' : isExpired ? 'expired' : 'pending';
                const badgeLabel = inv.status === 'completed' ? '✓ Aktif' : isExpired ? 'Kadaluarsa' : '⏳ Menunggu';
                return `
                <tr>
                    <td style="font-weight: 600;">${escapeHtml(inv.email)}</td>
                    <td style="color: var(--text-secondary);">${escapeHtml(inv.display_name || '-')}</td>
                    <td><span class="invite-badge ${badgeClass}">${badgeLabel}</span></td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${formatDate(inv.token_expires)}</td>
                    <td>
                        ${inv.status !== 'completed' ? `
                            <button class="btn btn-sm btn-secondary" onclick="app.resendInvite(${inv.id}, '${escapeHtml(inv.email)}')">
                                <i class="fas fa-rotate-right"></i> Kirim Ulang
                            </button>
                        ` : '<span style="font-size:11px; color: var(--text-muted);">-</span>'}
                    </td>
                </tr>`;
            }).join('');
        }
    }

    async function inviteUser() {
        const email = document.getElementById('inviteEmail').value.trim();
        const name = document.getElementById('inviteName').value.trim();
        if (!email) { showToast('error', 'Email Kosong', 'Masukkan email terlebih dahulu.'); return; }

        const btn = document.getElementById('inviteBtn');
        btn.disabled = true;

        try {
            const res = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, display_name: name })
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('inviteLinkText').value = data.setupUrl;
                document.getElementById('inviteEmailSent').textContent = data.email;
                document.getElementById('inviteResult').classList.remove('hidden');
                document.getElementById('inviteEmail').value = '';
                document.getElementById('inviteName').value = '';
                showToast('success', 'Undangan Dibuat', `Link siap dikirim ke ${data.email}`);
                loadAdminData();
            } else {
                showToast('error', 'Gagal', data.error);
            }
        } catch (e) {
            showToast('error', 'Error', 'Gagal menghubungi server.');
        } finally {
            btn.disabled = false;
        }
    }

    function copyInviteLink() {
        const link = document.getElementById('inviteLinkText').value;
        navigator.clipboard.writeText(link).then(() => {
            const icon = document.getElementById('copyIcon');
            icon.className = 'fas fa-check';
            showToast('success', 'Tersalin!', 'Link undangan telah disalin.');
            setTimeout(() => { icon.className = 'fas fa-copy'; }, 2000);
        }).catch(() => showToast('error', 'Gagal', 'Tidak dapat menyalin ke clipboard.'));
    }

    async function resendInvite(id, email) {
        try {
            const res = await fetch(`/api/admin/invites/${id}/resend`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('inviteLinkText').value = data.setupUrl;
                document.getElementById('inviteEmailSent').textContent = data.email;
                document.getElementById('inviteResult').classList.remove('hidden');
                showToast('success', 'Token Diperbarui', `Link baru siap untuk ${email}`);
                loadAdminData();
            } else {
                showToast('error', 'Gagal', data.error);
            }
        } catch (e) {
            showToast('error', 'Error', 'Gagal menghubungi server.');
        }
    }

    async function deleteUser(id) {
        if (!confirm('Hapus pengguna ini secara permanen? Seluruh history juga akan dihapus.')) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('success', 'User Dihapus', 'Data pengguna telah dihapus dari sistem.');
                loadAdminData();
            } else {
                const data = await res.json();
                showToast('error', 'Gagal', data.error);
            }
        } catch (e) {
            showToast('error', 'Error', 'Gagal menghubungi server.');
        }
    }

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
    //  AI ENGINE MODULE
    // ==========================================
    function setupAiEngine() {
        const DB_NAME = 'PromptCraftAIGen';
        const DB_VER = 1;

        // IndexedDB helpers
        const openAiDB = () => new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('messages')) {
                    const ms = db.createObjectStore('messages', { keyPath: 'id' });
                    ms.createIndex('projectId', 'projectId', { unique: false });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const idbPut = async (store, data) => { const db = await openAiDB(); const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(data); return new Promise(r => tx.oncomplete = r); };
        const idbGetAll = async (store) => { const db = await openAiDB(); const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).getAll(); return new Promise(r => { req.onsuccess = () => r((req.result || []).sort((a, b) => b.updatedAt - a.updatedAt)); }); };
        const idbGetByIndex = async (store, idx, key) => { const db = await openAiDB(); const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).index(idx).getAll(IDBKeyRange.only(key)); return new Promise(r => { req.onsuccess = () => r((req.result || []).sort((a, b) => a.id - b.id)); }); };
        const idbDeleteProject = async (pid) => {
            const db = await openAiDB();
            const tx = db.transaction(['projects', 'messages'], 'readwrite');
            tx.objectStore('projects').delete(pid);
            const ms = tx.objectStore('messages').index('projectId').openCursor(IDBKeyRange.only(pid));
            ms.onsuccess = (e) => { const c = e.target.result; if (c) { c.delete(); c.continue(); } };
            return new Promise(r => tx.oncomplete = r);
        };

        // DOM refs
        const emptyState = document.getElementById('aiEmptyState');
        const messagesEl = document.getElementById('aiMessages');
        const promptInput = document.getElementById('aiPromptInput');
        const sendBtn = document.getElementById('aiBtnSend');
        const enhanceBtn = document.getElementById('aiBtnEnhance');
        const newProjectBtn = document.getElementById('aiNewProject');
        const projectListEl = document.getElementById('aiProjectList');
        const apiStatusEl = document.getElementById('aiApiStatus');

        if (!promptInput) return; // Page not present

        let aiProjects = [];
        let aiCurrentProjectId = null;
        let aiMessages = [];
        let aiGenerating = false;

        const getSettings = () => ({
            engine: document.getElementById('aiEngine')?.value || 'freepik',
            mode: document.getElementById('aiMode')?.value || 'portrait',
            style: document.getElementById('aiStyle')?.value || 'realistic'
        });

        // Load projects
        const loadProjects = async () => {
            aiProjects = await idbGetAll('projects');
            renderProjectList();
        };

        const renderProjectList = () => {
            if (aiProjects.length === 0) {
                projectListEl.innerHTML = '<p class="ai-empty-history">Belum ada riwayat</p>';
                return;
            }
            projectListEl.innerHTML = aiProjects.map(p => `
                <div class="ai-project-item ${p.id === aiCurrentProjectId ? 'active' : ''}" data-id="${p.id}">
                    <span class="ai-proj-title">${escapeHtml(p.title)}</span>
                    <button class="ai-proj-delete" data-del="${p.id}" title="Hapus"><i class="fas fa-trash-can"></i></button>
                </div>
            `).join('');

            projectListEl.querySelectorAll('.ai-project-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.ai-proj-delete')) return;
                    selectProject(el.dataset.id);
                });
            });
            projectListEl.querySelectorAll('.ai-proj-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const pid = btn.dataset.del;
                    await idbDeleteProject(pid);
                    if (aiCurrentProjectId === pid) startNewProject();
                    await loadProjects();
                });
            });
        };

        const selectProject = async (pid) => {
            aiCurrentProjectId = pid;
            aiMessages = await idbGetByIndex('messages', 'projectId', pid);
            renderMessages();
            renderProjectList();
        };

        const startNewProject = () => {
            aiCurrentProjectId = null;
            aiMessages = [];
            renderMessages();
            renderProjectList();
            promptInput.focus();
        };

        // Render messages
        const renderMessages = () => {
            if (aiMessages.length === 0) {
                emptyState.style.display = '';
                messagesEl.classList.remove('has-messages');
                messagesEl.innerHTML = '';
                return;
            }
            emptyState.style.display = 'none';
            messagesEl.classList.add('has-messages');

            messagesEl.innerHTML = aiMessages.map(msg => {
                if (msg.role === 'user') {
                    return `<div class="ai-msg user"><div class="ai-msg-content"><div class="ai-msg-bubble">${escapeHtml(msg.content)}</div></div></div>`;
                }
                if (msg.type === 'status') {
                    return `<div class="ai-msg" data-msgid="${msg.id}"><div class="ai-msg-avatar"><i class="fas fa-sparkles"></i></div><div class="ai-msg-content"><div class="ai-msg-status"><i class="fas fa-spinner fa-spin"></i><span>${escapeHtml(msg.content)}</span></div></div></div>`;
                }
                if (msg.type === 'error') {
                    return `<div class="ai-msg"><div class="ai-msg-avatar"><i class="fas fa-sparkles"></i></div><div class="ai-msg-content"><div class="ai-msg-error"><i class="fas fa-circle-exclamation"></i><span>${escapeHtml(msg.content)}</span><button class="ai-retry-btn" data-retry="${escapeHtml(msg.originalPrompt)}"><i class="fas fa-rotate-right"></i></button></div></div></div>`;
                }
                if (msg.type === 'media') {
                    const modeClass = msg.imageMode || 'portrait';
                    return `<div class="ai-msg"><div class="ai-msg-avatar"><i class="fas fa-sparkles"></i></div><div class="ai-msg-content"><div class="ai-media-info"><i class="fas fa-circle-check"></i><span>${escapeHtml(msg.content)}</span></div><div class="ai-media-card ${modeClass}"><img src="${msg.mediaUrl}" alt="Generated" loading="lazy"><div class="ai-media-overlay"><p class="ai-media-prompt">"${escapeHtml(msg.originalPrompt)}"</p><div class="ai-media-engine"><i class="fas fa-sparkles"></i>${escapeHtml(msg.engineSource || 'Engine')}</div></div><div class="ai-media-actions"><a href="${msg.mediaUrl}" target="_blank" download title="Unduh"><i class="fas fa-download"></i></a><button data-retry="${escapeHtml(msg.originalPrompt)}" title="Buat Ulang"><i class="fas fa-rotate-right"></i></button></div></div></div></div>`;
                }
                return '';
            }).join('');

            // Add retry listeners
            messagesEl.querySelectorAll('[data-retry]').forEach(btn => {
                btn.addEventListener('click', () => handleGenerate(btn.dataset.retry));
            });

            messagesEl.scrollTop = messagesEl.scrollHeight;
        };

        // Save message to IndexedDB & state
        const saveMsg = async (msg, projectId) => {
            const full = { ...msg, projectId };
            await idbPut('messages', full);

            // Update project timestamp
            const proj = aiProjects.find(p => p.id === projectId);
            if (proj) {
                proj.updatedAt = Date.now();
                await idbPut('projects', proj);
            }

            // Update local state
            const idx = aiMessages.findIndex(m => m.id === msg.id);
            if (idx > -1) aiMessages[idx] = full;
            else aiMessages.push(full);

            renderMessages();
        };

        // --- Generation Logic ---
        const generateFreepik = async (prompt, settings, updateStatus) => {
            updateStatus('Mengirim ke Freepik...');
            const res = await fetch('/api/ai/freepik', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    styling: {
                        color: 'vibrant', framing: settings.mode,
                        lighting: 'cinematic',
                        style: settings.style === 'cinematic' ? 'realistic' : settings.style
                    }
                })
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Freepik gagal'); }
            updateStatus('Memproses gambar Freepik...');
            const data = await res.json();
            if (data.data?.[0]?.base64) return { url: `data:image/jpeg;base64,${data.data[0].base64}`, source: 'Freepik Engine' };
            if (data.data?.[0]?.url) return { url: data.data[0].url, source: 'Freepik Engine' };
            throw new Error('Respons Freepik kosong');
        };

        const generateLeonardo = async (prompt, settings, updateStatus) => {
            const dim = settings.mode === 'portrait' ? { w: 512, h: 896 } : settings.mode === 'landscape' ? { w: 896, h: 512 } : { w: 768, h: 768 };
            updateStatus('Meminta Leonardo AI...');
            const res = await fetch('/api/ai/leonardo/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `${prompt}, ${settings.style} style, highly detailed`, height: dim.h, width: dim.w })
            });
            if (!res.ok) throw new Error('Leonardo generate gagal');
            const data = await res.json();
            const genId = data.sdGenerationJob?.generationId;
            if (!genId) throw new Error('Tidak ada Generation ID');

            updateStatus('Menunggu rendering Leonardo...');
            for (let i = 0; i < 25; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const poll = await fetch(`/api/ai/leonardo/status/${genId}`);
                if (!poll.ok) continue;
                const pd = await poll.json();
                const st = pd.generations_by_pk?.status;
                if (st === 'COMPLETE') {
                    const imgs = pd.generations_by_pk?.generated_images;
                    if (imgs?.[0]?.url) return { url: imgs[0].url, source: 'Leonardo AI' };
                }
                if (st === 'FAILED') throw new Error('Leonardo rendering gagal');
                if (i % 2 === 0) updateStatus(`Merender gambar... (${Math.floor(i / 2) + 1})`);
            }
            throw new Error('Timeout Leonardo');
        };

        const generateImagen = async (prompt, settings, updateStatus) => {
            updateStatus('Mengirim ke Google Imagen...');
            const aspect = settings.mode === 'portrait' ? '9:16' : settings.mode === 'landscape' ? '16:9' : '1:1';
            const res = await fetch('/api/ai/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `${prompt}, ${settings.style} style, highly detailed`, aspectRatio: aspect })
            });
            if (!res.ok) throw new Error('Google Imagen gagal');
            const data = await res.json();
            return { url: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`, source: 'Google Imagen' };
        };

        const masterGenerate = async (prompt, settings, updateStatus) => {
            if (settings.engine === 'freepik') {
                try { return await generateFreepik(prompt, settings, updateStatus); }
                catch (err) {
                    console.warn('Freepik fallback:', err);
                    updateStatus('Freepik gagal, fallback ke Imagen...');
                    return await generateImagen(prompt, settings, updateStatus);
                }
            }
            if (settings.engine === 'leonardo') return await generateLeonardo(prompt, settings, updateStatus);
            if (settings.engine === 'imagen') return await generateImagen(prompt, settings, updateStatus);
        };

        // Handle generation
        const handleGenerate = async (textOverride) => {
            const text = (textOverride || promptInput.value).trim();
            if (!text || aiGenerating) return;
            promptInput.value = '';
            aiGenerating = true;
            sendBtn.disabled = true;

            const settings = getSettings();

            // Check API key availability
            const engineLabel = settings.engine === 'freepik' ? 'Freepik' : settings.engine === 'leonardo' ? 'Leonardo AI' : 'Google Imagen';

            // Ensure project exists
            let pid = aiCurrentProjectId;
            if (!pid) {
                pid = Date.now().toString();
                aiCurrentProjectId = pid;
                const newProj = { id: pid, title: text.substring(0, 30) + (text.length > 30 ? '...' : ''), createdAt: Date.now(), updatedAt: Date.now() };
                await idbPut('projects', newProj);
                aiProjects.unshift(newProj);
                renderProjectList();
            }

            // User message
            const userMsgId = Date.now();
            await saveMsg({ id: userMsgId, role: 'user', content: text }, pid);

            // Status message
            const statusId = Date.now() + 1;
            await saveMsg({ id: statusId, role: 'assistant', type: 'status', content: `Menghubungkan ke ${engineLabel}...` }, pid);

            try {
                const updateStatus = async (txt) => { await saveMsg({ id: statusId, role: 'assistant', type: 'status', content: txt }, pid); };
                const result = await masterGenerate(text, settings, updateStatus);

                await saveMsg({
                    id: statusId, role: 'assistant', type: 'media',
                    content: `Gambar siap! Dioptimalkan dengan gaya ${settings.style}.`,
                    mediaUrl: result.url,
                    engineSource: result.source,
                    originalPrompt: text,
                    imageMode: settings.mode
                }, pid);
            } catch (err) {
                await saveMsg({
                    id: statusId, role: 'assistant', type: 'error',
                    content: `Error: ${err.message}`,
                    originalPrompt: text
                }, pid);
            } finally {
                aiGenerating = false;
                sendBtn.disabled = false;
                await loadProjects();
            }
        };

        // Handle enhance
        const handleEnhance = async () => {
            const text = promptInput.value.trim();
            if (!text || aiGenerating) return;

            if (!geminiApiKey || !apiKeyVerified) {
                showToast('error', 'API Key Belum Siap', 'Silakan atur Gemini API key di Settings terlebih dahulu.');
                return;
            }

            enhanceBtn.disabled = true;
            enhanceBtn.classList.add('loading');
            enhanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const systemPrompt = "You are an expert AI image prompt engineer. Your goal is to rewrite the user's short idea into a highly detailed, dramatic, and cinematic image prompt description. Write the result in English. DO NOT add any conversational text, introductions, or conclusions. Provide ONLY the text prompt.";
                const userPrompt = `Ide awal: "${text}"`;

                const enhanced = await window.app.generateWithGemini ? await window.app.generateWithGemini(systemPrompt, userPrompt) : (typeof generateWithGemini === 'function' ? await generateWithGemini(systemPrompt, userPrompt) : null);

                if (enhanced) {
                    promptInput.value = enhanced.trim();
                    showToast('success', 'Prompt Diperbagus', 'Gemini AI telah meningkatkan prompt Anda.');
                } else {
                    showToast('error', 'Gagal', 'Gagal memperbagus prompt. Pastikan kuota API Key mencukupi.');
                }
            } catch (e) {
                showToast('error', 'Error', 'Terjadi kesalahan sistem.');
            } finally {
                enhanceBtn.disabled = false;
                enhanceBtn.classList.remove('loading');
                enhanceBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i>';
            }
        };

        // Event listeners
        sendBtn.addEventListener('click', () => handleGenerate());
        enhanceBtn.addEventListener('click', handleEnhance);
        newProjectBtn.addEventListener('click', startNewProject);

        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
        });

        // Suggested prompts
        document.querySelectorAll('.ai-suggest-chip').forEach(chip => {
            chip.addEventListener('click', () => handleGenerate(chip.dataset.prompt));
        });

        // Check API status
        const checkApiStatus = () => {
            const engine = document.getElementById('aiEngine')?.value;
            let hasKey = false;
            if (engine === 'freepik') hasKey = !!currentUser?.freepik_api_key;
            else if (engine === 'leonardo') hasKey = !!currentUser?.leonardo_api_key;
            else if (engine === 'imagen') hasKey = !!currentUser?.gemini_api_key;

            if (hasKey) {
                apiStatusEl.className = 'ai-api-status';
                apiStatusEl.innerHTML = '<i class="fas fa-circle-check"></i><span>API Key siap digunakan</span>';
            } else {
                apiStatusEl.className = 'ai-api-status offline';
                apiStatusEl.innerHTML = '<i class="fas fa-circle-xmark"></i><span>API Key belum dikonfigurasi</span>';
            }
        };

        document.getElementById('aiEngine')?.addEventListener('change', checkApiStatus);

        // Public interface for navigation triggers
        window._aiEngine = {
            onPageLoad: () => {
                loadProjects();
                checkApiStatus();
            }
        };

        // Initial load
        loadProjects();
        checkApiStatus();
    }

    // ==========================================
    //  AI VIDEO ENGINE UI LOGIC
    // ==========================================
    function toggleVideoQueue() {
        const drop = document.getElementById('videoQueueDropdown');
        if (drop) drop.classList.toggle('show');
    }

    let _activeVideoUrl = null;

    async function simulateVideoGenerate() {
        const input = document.getElementById('videoPromptInput');
        const ws = document.getElementById('videoWorkspace');
        const promptValue = input.value.trim();

        if (!promptValue) {
            showToast('error', 'Prompt Kosong', 'Silakan ketik deskripsi video terlebih dahulu.');
            return;
        }

        ws.classList.add('generating');
        const qTitle = document.getElementById('queueTitleText');
        const fPrompt = document.getElementById('finalDetailPrompt');
        const qBadge = document.getElementById('videoQueueBadge');

        if (qTitle) qTitle.innerText = 'Video: ' + promptValue.substring(0, 30) + '...';
        if (fPrompt) fPrompt.innerText = promptValue;
        if (qBadge) qBadge.innerText = '1';

        // UI Prep
        const fill = document.getElementById('genProgressFill');
        const progressLabel = document.getElementById('genProgressLabel');
        const queueProgress = document.getElementById('queueProgressText');

        if (fill) fill.style.width = '5%';
        if (progressLabel) progressLabel.innerText = 'Initializing...';

        try {
            // Initiate Leonardo Seedance API request
            const initRes = await fetch('/api/ai/leonardo/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptValue, duration: 4, width: 704, height: 1248 })
            });
            const initData = await initRes.json();

            if (!initRes.ok) throw new Error(initData.error || 'Failed to start video generation.');

            let genId = initData.sdGenerationJob?.generationId || initData.motionSvdGenerationJob?.generationId || initData.generationId || initData.id;
            if (!genId) {
                const searchId = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (obj.generationId) genId = obj.generationId;
                    else Object.values(obj).forEach(searchId);
                };
                searchId(initData);
            }
            if (!genId) {
                console.error("Leonardo Init Failed, Raw Data:", initData);
                throw new Error('Generation ID not found. Payload: ' + JSON.stringify(initData).substring(0, 100));
            }

            // Polling
            let ticks = 0;
            if (window._vidInterval) clearInterval(window._vidInterval);

            window._vidInterval = setInterval(async () => {
                ticks++;
                // Update fake progress bar visually
                const visualPct = Math.min(95, ticks * 2);
                if (fill) fill.style.width = visualPct + '%';
                if (progressLabel) progressLabel.innerText = visualPct + '%';
                if (queueProgress) queueProgress.innerText = visualPct + '%';

                // Poll every 5 ticks (each interval is 1s, so poll every 5s)
                if (ticks % 5 === 0) {
                    try {
                        const statusRes = await fetch(`/api/ai/leonardo/status/${genId}`);
                        const statusData = await statusRes.json();
                        const genData = statusData.generations_by_pk;

                        if (genData && genData.status === 'COMPLETE') {
                            clearInterval(window._vidInterval);
                            if (fill) fill.style.width = '100%';
                            if (progressLabel) progressLabel.innerText = 'Done!';

                            const videoUrl = genData.generated_images?.[0]?.motionMP4URL || genData.generated_images?.[0]?.url;
                            _activeVideoUrl = videoUrl;

                            const cardInner = document.querySelector('.gen-card-inner');
                            if (cardInner) {
                                cardInner.innerHTML = `<video src="${videoUrl}" autoplay loop muted style="width:100%; height:100%; object-fit:cover; border-radius:12px; cursor:pointer;" onclick="app.openVideoResult()"></video>`;
                            }

                            const qs = document.querySelector('.queue-status');
                            if (qs) qs.innerHTML = '<i class="fas fa-check" style="color:#10b981;"></i> Complete';
                            showToast('success', 'Generate Selesai', 'Video telah berhasil dibuat!');

                            // Save to DB via network
                            fetch('/api/history', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'video', prompt_text: promptValue, result_text: videoUrl, platform: 'Leonardo Seedance 1.0 Lite' })
                            });

                            // Inject into current UI state
                            history.unshift({
                                type: 'video',
                                prompt_text: promptValue,
                                result_text: videoUrl,
                                video_url: videoUrl, // Important for renderRecentActivity
                                created_at: new Date().toISOString()
                            });
                            renderRecentActivity();
                            if (typeof renderHistory === 'function') renderHistory();

                        } else if (genData && genData.status === 'FAILED') {
                            throw new Error('Generation failed on Leonardo end.');
                        }
                    } catch (pollErr) {
                        console.error('Polling error:', pollErr);
                        // Log but wait for next poll
                    }
                }
            }, 1000);

        } catch (err) {
            clearInterval(window._vidInterval);
            showToast('error', 'Generate Gagal', err.message);
            ws.classList.remove('generating');
            if (qBadge) qBadge.innerText = '0';
        }
    }

    function openVideoResult() {
        const modal = document.getElementById('videoResultModal');
        if (modal) {
            if (_activeVideoUrl) {
                const playerContainer = document.querySelector('.video-modal-player');
                // find or create video element
                let vid = playerContainer.querySelector('video');
                if (!vid) {
                    vid = document.createElement('video');
                    vid.className = 'video-player-poster'; // reuse same styling
                    vid.controls = true;
                    vid.autoplay = true;
                    vid.loop = true;
                    vid.style.objectFit = 'contain';

                    // remove placeholder img if exists
                    const img = playerContainer.querySelector('img');
                    if (img) img.style.display = 'none';

                    playerContainer.insertBefore(vid, playerContainer.firstChild);
                }
                vid.src = _activeVideoUrl;
                // update download button
                const dlBtn = document.querySelector('.v-btn-download');
                if (dlBtn) {
                    dlBtn.onclick = () => window.open(_activeVideoUrl, '_blank');
                }
            }
            modal.classList.add('show');
        }
    }

    function closeVideoResult() {
        const modal = document.getElementById('videoResultModal');
        if (modal) modal.classList.remove('show');

        // Stop video playback safely
        const vid = document.querySelector('.video-modal-player video');
        if (vid) {
            vid.pause();
            vid.src = '';
        }

        // Return to normal workspace
        const ws = document.getElementById('videoWorkspace');
        ws.classList.remove('generating');
        const input = document.getElementById('videoPromptInput');
        if (input) input.value = '';
        const qBadge = document.getElementById('videoQueueBadge');
        if (qBadge) qBadge.innerText = '0';
        const qs = document.querySelector('.queue-status');
        if (qs) qs.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating... (<span id="queueProgressText">0/120</span>)';

        const fill = document.getElementById('genProgressFill');
        if (fill) {
            fill.style.width = '0%';
            fill.parentNode.nextElementSibling.querySelector('.gen-card-inner').innerHTML = '<i class="fas fa-cube fa-spin" style="font-size: 3rem; color: #10b981; margin-bottom: 20px;"></i><div style="font-size: 0.8rem; color: var(--text-secondary);">Almost there...</div>';
        }
    }

    // ==========================================
    //  PUBLIC API
    // ==========================================
    window.app = {
        copyText: copyToClipboard,
        useTemplate: useTemplate,
        navigateTo: navigateTo,
        loadAdminData: loadAdminData,
        deleteUser: deleteUser,
        inviteUser: inviteUser,
        copyInviteLink: copyInviteLink,
        resendInvite: resendInvite,
        toggleVideoQueue: toggleVideoQueue,
        simulateVideoGenerate: simulateVideoGenerate,
        openVideoResult: openVideoResult,
        closeVideoResult: closeVideoResult
    };

    // ==========================================
    //  BOOT
    // ==========================================
    document.addEventListener('DOMContentLoaded', init);
})();
