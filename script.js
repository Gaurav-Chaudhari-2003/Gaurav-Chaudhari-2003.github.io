// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('nav-active');

    // Toggle icon between bars and times
    const icon = hamburger.querySelector('i');
    if (navLinks.classList.contains('nav-active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Close mobile nav when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('nav-active');
        const icon = hamburger.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    });
});

// Smooth Scrolling for Anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 70, // offset for fixed navbar
                behavior: 'smooth'
            });
        }
    });
});

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
        navbar.style.background = 'rgba(10, 10, 15, 0.85)';
    } else {
        navbar.style.boxShadow = 'none';
        navbar.style.background = 'rgba(10, 10, 15, 0.7)';
    }
});

// Scroll Reveal / Fade-in Animation using IntersectionObserver
const faders = document.querySelectorAll('.section, .glass-card, .timeline-item');

const appearOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function (entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        } else {
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
        }
    });
}, appearOptions);

faders.forEach(fader => {
    fader.classList.add('fade-in');
    appearOnScroll.observe(fader);
});

// Active Link highlighting on scroll
const sections = document.querySelectorAll('section, header');
const navItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
            item.classList.add('active');
        }
    });
});

// Advanced Modal & Demo Logic
const modal = document.getElementById('demo-modal');
const closeBtn = document.querySelector('.close-btn');
const demoBtns = document.querySelectorAll('.demo-btn');
const demoContainers = document.querySelectorAll('.demo-container');

function resetDemos() {
    // RAG
    const ragResults = document.getElementById('rag-results-area');
    if (ragResults) {
        ragResults.classList.add('hidden');
        document.getElementById('rag-facts-list').innerHTML = '';
        document.getElementById('rag-summary-text').innerHTML = '';
        document.getElementById('rag-scanning-area').classList.add('hidden');
        document.querySelectorAll('.vector-node').forEach(n => n.className = 'vector-node');
    }

    // Iris
    if (typeof irisTimeouts !== 'undefined') {
        if(typeof irisIsRunning !== 'undefined') irisIsRunning = false;
        irisTimeouts.forEach(clearTimeout);
        irisTimeouts = [];
    }
    const occ = document.getElementById('iris-occ');
    if (occ) {
        occ.innerText = '0';
        document.getElementById('iris-light').innerText = 'OFF';
        document.getElementById('iris-light').style.color = 'var(--text-main)';
        document.getElementById('iris-room-darkness').className = 'room-overlay dark';
        document.querySelectorAll('.cctv-person').forEach(p => {
            p.className = 'cctv-person ' + p.id.split('-')[1] + ' hidden';
        });
    }

    // Intent
    if (typeof intentTimeouts !== 'undefined') {
        intentTimeouts.forEach(clearTimeout);
        intentTimeouts = [];
    }
    document.querySelectorAll('.data-stream').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.server-node').forEach(n => n.classList.remove('active-blue', 'active-green', 'active-red'));
    const clsStat = document.getElementById('cls-status');
    if(clsStat) {
        clsStat.innerText = 'Idle';
        clsStat.style.color = '#94a3b8';
    }
    const ttip = document.getElementById('cls-tooltip');
    if(ttip) ttip.classList.add('hidden');
    const fBub = document.getElementById('faq-bubble');
    if(fBub) fBub.classList.add('hidden');
    const mBub = document.getElementById('midc-bubble');
    if(mBub) mBub.classList.add('hidden');

    // Recon
    if (typeof reconTimeouts !== 'undefined') {
        reconTimeouts.forEach(clearTimeout);
        reconTimeouts = [];
    }
    const scanner = document.getElementById('recon-scanner');
    if (scanner) {
        scanner.classList.add('hidden');
        scanner.classList.remove('recon-scan-anim');
        document.querySelectorAll('.ext-span').forEach(e => e.classList.remove('extracted'));
        document.querySelectorAll('.recon-tx').forEach(tx => tx.classList.remove('scanning', 'matched'));
        const badge2 = document.getElementById('recon-badge-2');
        if (badge2) badge2.style.opacity = '0';
        const reconStatus = document.getElementById('recon-status');
        if (reconStatus) {
            reconStatus.innerText = 'Awaiting receipt scan...';
            reconStatus.style.color = '#38bdf8';
        }
    }

    // Pothole
    if (typeof phTimeouts !== 'undefined') {
        phTimeouts.forEach(clearTimeout);
        phTimeouts = [];
    }
    const phImgView = document.getElementById('ph-image-view');
    if(phImgView) {
        phImgView.className = '';
        document.getElementById('ph-scanner').classList.add('hidden');
        document.getElementById('ph-scanner').classList.remove('ph-scan-anim');
        document.getElementById('ph-bbox').classList.add('hidden');
        document.getElementById('ph-new-marker').classList.add('hidden');
        document.getElementById('ph-ai-status').innerText = 'Awaiting Image...';
        document.getElementById('ph-ai-status').style.color = '#94a3b8';
        document.getElementById('ph-log').innerText = '> System Ready. Awaiting citizen reports.';
    }

    // PMRDA Demo Reset
    if (typeof resetPmrdaDemo === 'function') {
        resetPmrdaDemo();
    }
}

if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => { modal.classList.remove('show'); resetDemos(); });
    window.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('show'); resetDemos(); } });
}

// RAG Demo Logic
const ragSearchBtn = document.getElementById('rag-search-btn');
const ragScanArea = document.getElementById('rag-scanning-area');
const ragResultsArea = document.getElementById('rag-results-area');
const vectorGrid = document.querySelector('.vector-grid');
const factsList = document.getElementById('rag-facts-list');
const summaryText = document.getElementById('rag-summary-text');

// Generate grid nodes
if (vectorGrid && vectorGrid.children.length === 0) {
    for(let i=0; i<50; i++) {
        const node = document.createElement('div');
        node.className = 'vector-node';
        vectorGrid.appendChild(node);
    }
}

ragSearchBtn.addEventListener('click', () => {
    // Reset
    ragResultsArea.classList.add('hidden');
    factsList.innerHTML = '';
    summaryText.innerHTML = '';
    const nodes = document.querySelectorAll('.vector-node');
    nodes.forEach(n => n.className = 'vector-node');
    
    // Start scan
    ragScanArea.classList.remove('hidden');
    
    // Simulate scanning vectors
    let scanInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * nodes.length);
        nodes[randomIndex].classList.add('scanned');
        setTimeout(() => {
            if(!nodes[randomIndex].classList.contains('match')) {
                nodes[randomIndex].classList.remove('scanned');
            }
        }, 300);
    }, 50);

    // Found matches after 2s
    setTimeout(() => {
        clearInterval(scanInterval);
        [12, 27, 42].forEach(idx => nodes[idx].classList.add('match'));
        
        // Show results
        setTimeout(() => {
            ragScanArea.classList.add('hidden');
            ragResultsArea.classList.remove('hidden');
            
            // Populate facts one by one
            const facts = [
                "Document: Q3_Financial_Report.pdf (Confidence: 98%) - Q3 Revenue was $4.2M.",
                "Document: Enterprise_Sales_Data.xlsx (Confidence: 91%) - Software sales accounted for 75% of revenue.",
                "Document: Q2_Comparison.pdf (Confidence: 85%) - Q3 showed a 15% increase over Q2."
            ];
            
            facts.forEach((fact, index) => {
                setTimeout(() => {
                    const li = document.createElement('li');
                    li.innerText = fact;
                    factsList.appendChild(li);
                }, index * 800);
            });
            
            // Type summary after facts are loaded
            setTimeout(() => {
                const summary = "Based on the retrieved documents, our Q3 revenue reached $4.2M, representing a 15% increase over Q2. The primary driver for this growth was software enterprise sales, which accounted for 75% of the total revenue.";
                let charIndex = 0;
                const typing = setInterval(() => {
                    if (charIndex < summary.length) {
                        summaryText.innerHTML += summary.charAt(charIndex);
                        charIndex++;
                    } else {
                        clearInterval(typing);
                    }
                }, 20);
            }, facts.length * 800 + 500);
            
        }, 1000);
    }, 2000);
});

// Iris Demo Logic
const irisBtn = document.getElementById('iris-simulate-btn');
const irisRoom = document.getElementById('iris-room-darkness');
const occCount = document.getElementById('iris-occ');
const lightStatus = document.getElementById('iris-light');
const p1 = document.getElementById('cctv-p1');
const p2 = document.getElementById('cctv-p2');
const p3 = document.getElementById('cctv-p3');
const p4 = document.getElementById('cctv-p4');
const allPersons = [p1, p2, p3, p4];
let irisTimeouts = [];
let irisIsRunning = false;

function runIrisSequence() {
    if(!irisIsRunning) return;
    
    // Reset state for loop
    occCount.innerText = '0';
    lightStatus.innerText = 'OFF';
    lightStatus.style.color = 'var(--text-main)';
    irisRoom.className = 'room-overlay dark';
    
    allPersons.forEach(p => {
        p.className = 'cctv-person ' + p.id.split('-')[1]; // keep p1, p2, etc
        p.classList.remove('hidden');
    });

    // T=1s: 2 people enter
    irisTimeouts.push(setTimeout(() => {
        if(!irisIsRunning) return;
        p1.classList.add('stage1');
        p2.classList.add('stage1');
        occCount.innerText = '2';
        lightStatus.innerText = '50% (Zone A ON)';
        lightStatus.style.color = '#fbbf24';
        irisRoom.className = 'room-overlay dim';
    }, 1000));

    // T=6s: 2 more people enter
    irisTimeouts.push(setTimeout(() => {
        if(!irisIsRunning) return;
        p1.classList.replace('stage1', 'stage2');
        p2.classList.replace('stage1', 'stage2');
        p3.classList.add('stage2');
        p4.classList.add('stage2');
        occCount.innerText = '4';
        lightStatus.innerText = '100% (ALL ON)';
        lightStatus.style.color = '#22c55e';
        irisRoom.className = 'room-overlay bright';
    }, 6000));

    // T=10s: wander around
    irisTimeouts.push(setTimeout(() => {
        if(!irisIsRunning) return;
        p1.classList.replace('stage2', 'stage3');
        p2.classList.replace('stage2', 'stage3');
        p3.classList.replace('stage2', 'stage3');
        p4.classList.replace('stage2', 'stage3');
    }, 10000));

    // T=14s: 2 people leave, 2 remain
    irisTimeouts.push(setTimeout(() => {
        if(!irisIsRunning) return;
        p3.classList.add('leave');
        p4.classList.add('leave');
        p1.classList.replace('stage3', 'stage1');
        p2.classList.replace('stage3', 'stage1');
        occCount.innerText = '2';
        lightStatus.innerText = '50% (Zone A ON)';
        lightStatus.style.color = '#fbbf24';
        irisRoom.className = 'room-overlay dim';
    }, 14000));

    // T=18s: all leave
    irisTimeouts.push(setTimeout(() => {
        if(!irisIsRunning) return;
        p1.classList.add('leave');
        p2.classList.add('leave');
        occCount.innerText = '0';
        lightStatus.innerText = 'OFF';
        lightStatus.style.color = 'var(--text-main)';
        irisRoom.className = 'room-overlay dark';
        
        // Loop again after 2 seconds
        irisTimeouts.push(setTimeout(runIrisSequence, 2000));
    }, 18000));
}

if (irisBtn) {
    irisBtn.addEventListener('click', () => {
        // Reset state
        irisTimeouts.forEach(clearTimeout);
        irisTimeouts = [];
        irisIsRunning = true;
        runIrisSequence();
    });
}

// Intent Engine Demo Logic
const btnFaq = document.getElementById('btn-intent-faq');
const btnInv = document.getElementById('btn-intent-inv');
const btnSend = document.getElementById('btn-intent-send');
const customInput = document.getElementById('intent-custom-input');
let intentTimeouts = [];

function runAdvancedIntent(message) {
    // Reset state
    intentTimeouts.forEach(clearTimeout);
    intentTimeouts = [];
    document.querySelectorAll('.data-stream').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.server-node').forEach(n => n.classList.remove('active-blue', 'active-green', 'active-red'));
    
    document.getElementById('cls-status').innerText = 'Idle';
    document.getElementById('cls-status').style.color = '#94a3b8';
    
    const tooltip = document.getElementById('cls-tooltip');
    tooltip.classList.add('hidden');
    tooltip.innerText = '';
    
    document.getElementById('faq-bubble').classList.add('hidden');
    document.getElementById('midc-bubble').classList.add('hidden');

    if(!message || message.trim() === '') message = "Hello";

    // Start Flow
    intentTimeouts.push(setTimeout(() => {
        document.getElementById('node-in').classList.add('active-blue');
        document.getElementById('stream-input-cls').classList.remove('hidden');
        
        intentTimeouts.push(setTimeout(() => {
            document.getElementById('node-cls').classList.add('active-blue');
            document.getElementById('cls-status').innerText = 'Analyzing';
            document.getElementById('cls-status').style.color = '#38bdf8';
            
            tooltip.classList.remove('hidden');
            tooltip.style.borderColor = '#38bdf8';
            tooltip.innerText = "Tokenizing string...";
            
            intentTimeouts.push(setTimeout(() => {
                const msgLower = message.toLowerCase();
                const isInvestment = msgLower.includes('invest') || msgLower.includes('crore') || msgLower.includes('cr') || msgLower.includes('pune') || msgLower.includes('plant') || msgLower.includes('setup');
                
                document.getElementById('stream-input-cls').classList.add('hidden');
                document.getElementById('node-in').classList.remove('active-blue');
                
                if (isInvestment) {
                    tooltip.innerText = "Intent: High Prio Investment (99%)";
                    tooltip.style.borderColor = '#ef4444';
                    
                    document.getElementById('cls-status').innerText = 'Invest';
                    document.getElementById('cls-status').style.color = '#ef4444';
                    document.getElementById('node-cls').classList.replace('active-blue', 'active-red');
                    
                    document.getElementById('stream-cls-midc').classList.remove('hidden');
                    
                    intentTimeouts.push(setTimeout(() => {
                        document.getElementById('node-midc').classList.add('active-red');
                        document.getElementById('midc-bubble').classList.remove('hidden');
                    }, 1000));
                    
                } else {
                    tooltip.innerText = "Intent: General FAQ (87%)";
                    tooltip.style.borderColor = '#22c55e';
                    
                    document.getElementById('cls-status').innerText = 'FAQ';
                    document.getElementById('cls-status').style.color = '#22c55e';
                    document.getElementById('node-cls').classList.replace('active-blue', 'active-green');
                    
                    document.getElementById('stream-cls-faq').classList.remove('hidden');
                    
                    intentTimeouts.push(setTimeout(() => {
                        document.getElementById('node-faq').classList.add('active-green');
                        document.getElementById('faq-bubble').classList.remove('hidden');
                    }, 1000));
                }
            }, 1500));
        }, 1000));
    }, 200));
}

if(btnFaq) btnFaq.addEventListener('click', () => { customInput.value = "What are the required documents for setting a handmill?"; runAdvancedIntent(customInput.value); });
if(btnInv) btnInv.addEventListener('click', () => { customInput.value = "I want to setup a handmill in pune, here is my 5Cr investment plan."; runAdvancedIntent(customInput.value); });
if(btnSend) btnSend.addEventListener('click', () => runAdvancedIntent(customInput.value));
if(customInput) customInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') runAdvancedIntent(customInput.value); });

// Recon Demo Logic
const btnRecon = document.getElementById('btn-recon-start');
let reconTimeouts = [];

if (btnRecon) {
    btnRecon.addEventListener('click', () => {
        // Reset state
        reconTimeouts.forEach(clearTimeout);
        reconTimeouts = [];
        
        const scanner = document.getElementById('recon-scanner');
        const extSpans = document.querySelectorAll('.ext-span');
        const tx1 = document.getElementById('recon-tx-1');
        const tx2 = document.getElementById('recon-tx-2');
        const badge2 = document.getElementById('recon-badge-2');
        const status = document.getElementById('recon-status');
        
        scanner.classList.add('hidden');
        scanner.classList.remove('recon-scan-anim');
        extSpans.forEach(e => e.classList.remove('extracted'));
        tx1.classList.remove('scanning');
        tx2.classList.remove('scanning', 'matched');
        badge2.style.opacity = '0';
        status.innerText = 'Awaiting receipt scan...';
        status.style.color = '#38bdf8';

        // Step 1: Scan receipt
        reconTimeouts.push(setTimeout(() => {
            status.innerText = 'Scanning Physical Receipt with Vision AI...';
            scanner.classList.remove('hidden');
            scanner.classList.add('recon-scan-anim');
            
            // Step 2: Extract info
            reconTimeouts.push(setTimeout(() => {
                scanner.classList.add('hidden');
                extSpans.forEach(e => e.classList.add('extracted'));
                status.innerText = 'Extracted: Starbucks | 21-Aug-2026 | $12.50';
                
                // Step 3: Scan statements
                reconTimeouts.push(setTimeout(() => {
                    status.innerText = 'Querying Bank Statements for match...';
                    tx1.classList.add('scanning');
                    
                    reconTimeouts.push(setTimeout(() => {
                        tx1.classList.remove('scanning');
                        tx2.classList.add('scanning');
                        
                        // Step 4: Match
                        reconTimeouts.push(setTimeout(() => {
                            tx2.classList.remove('scanning');
                            tx2.classList.add('matched');
                            badge2.style.opacity = '1';
                            
                            status.innerText = 'Reconciliation Complete. Transaction Marked as Verified.';
                            status.style.color = '#22c55e';
                        }, 1500));
                    }, 1000));
                }, 1500));
            }, 2000)); // 2s scan animation
        }, 500));
    });
}

// Pothole Demo Logic
const btnPhReal = document.getElementById('btn-ph-real');
const btnPhFake = document.getElementById('btn-ph-fake');
let phTimeouts = [];

function runPotholeFlow(isReal) {
    phTimeouts.forEach(clearTimeout);
    phTimeouts = [];
    
    const imgView = document.getElementById('ph-image-view');
    const scanner = document.getElementById('ph-scanner');
    const bbox = document.getElementById('ph-bbox');
    const status = document.getElementById('ph-ai-status');
    const log = document.getElementById('ph-log');
    const marker = document.getElementById('ph-new-marker');
    
    // Reset state
    imgView.className = ''; 
    scanner.classList.add('hidden');
    scanner.classList.remove('ph-scan-anim');
    bbox.classList.add('hidden');
    marker.classList.add('hidden');
    
    if (isReal) {
        imgView.classList.add('ph-sim-bg-real');
        log.innerText = '> Citizen uploaded photo. Initiating AI scan...';
        status.innerText = 'Scanning...';
        status.style.color = '#38bdf8';
        
        phTimeouts.push(setTimeout(() => {
            scanner.classList.remove('hidden');
            scanner.classList.add('ph-scan-anim');
            
            phTimeouts.push(setTimeout(() => {
                scanner.classList.add('hidden');
                bbox.classList.remove('hidden');
                status.innerText = 'Pothole Detected!';
                status.style.color = '#ef4444';
                log.innerText = '> CRITICAL: Pothole detected (98% conf). Generating work report...';
                
                phTimeouts.push(setTimeout(() => {
                    marker.classList.remove('hidden');
                    log.innerHTML = '> Action: Work report sent to PMC Officer.<br><span style="color:#22c55e;">✔ Dashboard updated.</span>';
                }, 1500));
            }, 1500));
        }, 500));
    } else {
        imgView.classList.add('ph-sim-bg-fake');
        log.innerText = '> Citizen uploaded photo. Initiating AI scan...';
        status.innerText = 'Scanning...';
        status.style.color = '#38bdf8';
        
        phTimeouts.push(setTimeout(() => {
            scanner.classList.remove('hidden');
            scanner.classList.add('ph-scan-anim');
            
            phTimeouts.push(setTimeout(() => {
                scanner.classList.add('hidden');
                status.innerText = 'Clean Road';
                status.style.color = '#22c55e';
                log.innerHTML = '> RESULT: No defect detected.<br><span style="color:#38bdf8;">ℹ Discarding report. Saved manual review time for PMC officer.</span>';
            }, 1500));
        }, 500));
    }
}

if(btnPhReal) btnPhReal.addEventListener('click', () => runPotholeFlow(true));
if(btnPhFake) btnPhFake.addEventListener('click', () => runPotholeFlow(false));

// PMRDA & PMC DB Analytics Chatbot Demo Logic
let pmrdaTimeouts = [];

function resetPmrdaDemo() {
    pmrdaTimeouts.forEach(clearTimeout);
    pmrdaTimeouts = [];
    const progressArea = document.getElementById('pmrda-progress-area');
    const resultsArea = document.getElementById('pmrda-results-area');
    if (progressArea) progressArea.classList.add('hidden');
    if (resultsArea) resultsArea.classList.add('hidden');
}

function runPmrdaQuery(queryText) {
    resetPmrdaDemo();

    const input = document.getElementById('pmrda-query-input');
    const progressArea = document.getElementById('pmrda-progress-area');
    const progressStep = document.getElementById('pmrda-progress-step');
    const progressBar = document.getElementById('pmrda-progress-bar');
    const resultsArea = document.getElementById('pmrda-results-area');
    const sqlCode = document.getElementById('pmrda-sql-code');
    const tableContainer = document.getElementById('pmrda-table-container');
    const chartContainer = document.getElementById('pmrda-chart-container');
    const summaryText = document.getElementById('pmrda-summary-text');

    if (input) input.value = queryText;
    if (!progressArea) return;

    progressArea.classList.remove('hidden');
    progressBar.style.width = '15%';
    progressStep.innerText = 'Resolving User Context & RBAC Permissions (Town Planning Officer)...';

    pmrdaTimeouts.push(setTimeout(() => {
        progressBar.style.width = '40%';
        progressStep.innerText = 'Inspecting live PostgreSQL schema (Excluding bak_* snapshot tables)...';

        pmrdaTimeouts.push(setTimeout(() => {
            progressBar.style.width = '75%';
            progressStep.innerText = 'Searching Agent Memory & compiling PostgreSQL 16 query...';

            pmrdaTimeouts.push(setTimeout(() => {
                progressBar.style.width = '100%';
                progressStep.innerText = 'Query executed successfully. Streaming results...';

                pmrdaTimeouts.push(setTimeout(() => {
                    progressArea.classList.add('hidden');
                    resultsArea.classList.remove('hidden');

                    // Determine query type and populate realistic response
                    if (queryText.includes('Marathi') || queryText.includes('एकूण')) {
                        sqlCode.innerText = `SELECT \n  COUNT(*)::int AS total_applications,\n  COUNT(CASE WHEN status = 'approved' THEN 1 END)::int AS approved_cnt,\n  COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_cnt\nFROM rts_citizen_applications\nWHERE deleted_at IS NULL\n  AND status NOT IN ('deleted', 'started', 'draft');`;
                        
                        tableContainer.innerHTML = `
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid #334155; color:#94a3b8;">
                                        <th style="padding:6px;">Category (वर्ग)</th>
                                        <th style="padding:6px;">Applications (एकूण अर्ज)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px; color:#22c55e;">Approved (मंजूर)</td><td style="padding:6px; font-weight:bold;">3,142</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px; color:#f59e0b;">Pending (प्रलंबित)</td><td style="padding:6px; font-weight:bold;">854</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px; color:#ef4444;">Rejected (नामंजूर)</td><td style="padding:6px; font-weight:bold;">280</td></tr>
                                </tbody>
                            </table>`;

                        chartContainer.innerHTML = `
                            <svg width="100%" height="160" viewBox="0 0 240 160">
                                <circle cx="120" cy="80" r="55" fill="none" stroke="#22c55e" stroke-width="24" stroke-dasharray="250 350" />
                                <circle cx="120" cy="80" r="55" fill="none" stroke="#f59e0b" stroke-width="24" stroke-dasharray="70 350" stroke-dashoffset="-250" />
                                <circle cx="120" cy="80" r="55" fill="none" stroke="#ef4444" stroke-width="24" stroke-dasharray="25 350" stroke-dashoffset="-320" />
                                <text x="120" y="76" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">4,276</text>
                                <text x="120" y="94" text-anchor="middle" fill="#94a3b8" font-size="10">एकूण अर्ज</text>
                            </svg>`;

                        summaryText.innerText = "PMRDA प्रणाली सुरू झाल्यापासून आजपर्यंत एकूण 4,276 नागरिक अर्ज प्राप्त झाले आहेत. त्यापैकी 3,142 अर्ज मंजूर (73.5%), 854 अर्ज विविध टप्प्यांवर प्रलंबित (20%), तर 280 अर्ज नामंजूर करण्यात आले आहेत.";
                    
                    } else if (queryText.includes('status') || queryText.includes('grouped')) {
                        sqlCode.innerText = `SELECT \n  status, \n  COUNT(*)::int AS cnt \nFROM rts_citizen_applications \nWHERE deleted_at IS NULL \n  AND status NOT IN ('deleted', 'started', 'draft') \nGROUP BY status \nORDER BY cnt DESC;`;

                        tableContainer.innerHTML = `
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid #334155; color:#94a3b8;">
                                        <th style="padding:6px;">Status</th>
                                        <th style="padding:6px;">Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Approved</td><td style="padding:6px; font-weight:bold; color:#22c55e;">3,142</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Under Review (Desk)</td><td style="padding:6px; font-weight:bold; color:#38bdf8;">612</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Rejected</td><td style="padding:6px; font-weight:bold; color:#ef4444;">280</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Payment Pending</td><td style="padding:6px; font-weight:bold; color:#f59e0b;">242</td></tr>
                                </tbody>
                            </table>`;

                        chartContainer.innerHTML = `
                            <svg width="100%" height="160" viewBox="0 0 240 160">
                                <rect x="20" y="30" width="140" height="22" rx="4" fill="#22c55e" />
                                <text x="165" y="46" fill="#fff" font-size="10" font-weight="bold">3,142</text>
                                <rect x="20" y="60" width="45" height="22" rx="4" fill="#38bdf8" />
                                <text x="70" y="76" fill="#fff" font-size="10" font-weight="bold">612</text>
                                <rect x="20" y="90" width="22" height="22" rx="4" fill="#ef4444" />
                                <text x="47" y="106" fill="#fff" font-size="10" font-weight="bold">280</text>
                                <rect x="20" y="120" width="18" height="22" rx="4" fill="#f59e0b" />
                                <text x="43" y="136" fill="#fff" font-size="10" font-weight="bold">242</text>
                            </svg>`;

                        summaryText.innerText = "Breakdown of total 4,276 PMRDA applications by current status: 3,142 Approved (73.5%), 612 Under Active Desk Review, 280 Rejected due to incomplete documentation, and 242 Pending Payment Gateway completion.";

                    } else {
                        // Monthly trend (default)
                        sqlCode.innerText = `SELECT \n  TO_CHAR(created_at, 'Mon YYYY') AS month_label, \n  COUNT(*)::int AS total_applications \nFROM rts_citizen_applications \nWHERE created_at >= NOW() - INTERVAL '12 months' \n  AND status NOT IN ('deleted', 'started', 'draft') \nGROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at) \nORDER BY DATE_TRUNC('month', created_at) ASC;`;

                        tableContainer.innerHTML = `
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid #334155; color:#94a3b8;">
                                        <th style="padding:6px;">Month</th>
                                        <th style="padding:6px;">Submissions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Oct 2025</td><td style="padding:6px; font-weight:bold;">310</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Nov 2025</td><td style="padding:6px; font-weight:bold;">345</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Dec 2025</td><td style="padding:6px; font-weight:bold;">412</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Jan 2026</td><td style="padding:6px; font-weight:bold;">490</td></tr>
                                    <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;">Feb 2026</td><td style="padding:6px; font-weight:bold;">528</td></tr>
                                </tbody>
                            </table>`;

                        chartContainer.innerHTML = `
                            <svg width="100%" height="160" viewBox="0 0 240 160">
                                <path d="M 20 130 L 60 110 L 100 95 L 140 60 L 180 40 L 220 25" stroke="#38bdf8" stroke-width="3" fill="none" />
                                <circle cx="20" cy="130" r="4" fill="#38bdf8" />
                                <circle cx="60" cy="110" r="4" fill="#38bdf8" />
                                <circle cx="100" cy="95" r="4" fill="#38bdf8" />
                                <circle cx="140" cy="60" r="4" fill="#38bdf8" />
                                <circle cx="180" cy="40" r="4" fill="#38bdf8" />
                                <circle cx="220" cy="25" r="5" fill="#22c55e" />
                                <text x="215" y="15" fill="#22c55e" font-size="9" font-weight="bold">528</text>
                            </svg>`;

                        summaryText.innerText = "All-Time submission trend indicates consistent upward growth across PMRDA RTS services over the past 12 months, peaking at 528 applications in Feb 2026 driven by Town Planning & Building Permission approvals.";
                    }
                }, 300));
            }, 600));
        }, 500));
    }, 400));
}

// Bind PMRDA Event Listeners
const btnPmrdaRun = document.getElementById('btn-pmrda-run');
const pmrdaInput = document.getElementById('pmrda-query-input');
const pmrdaPresets = document.querySelectorAll('.pmrda-preset-btn');

if (btnPmrdaRun && pmrdaInput) {
    btnPmrdaRun.addEventListener('click', () => runPmrdaQuery(pmrdaInput.value));
    pmrdaInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') runPmrdaQuery(pmrdaInput.value); });
}

pmrdaPresets.forEach(btn => {
    btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-query');
        if (q) runPmrdaQuery(q);
    });
});

