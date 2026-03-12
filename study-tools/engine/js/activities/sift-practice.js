StudyEngine.registerActivity({
    id: 'sift-practice',
    name: 'SIFT Practice',
    icon: 'fas fa-shield-alt',
    description: 'Use the SIFT method to evaluate real sources — can you spot the fakes?',
    category: 'practice',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _sources: [],
    _currentIndex: 0,
    _answers: {},
    _siftNotes: {},
    _stats: { completed: 0, bestScore: 0 },

    _getSources() {
        return [
            {
                id: 'founders-museum-franklin',
                title: 'Benjamin Franklin — Founders Museum',
                subtitle: 'AI-generated video where a digital Benjamin Franklin "comes to life" to address viewers',
                author: 'White House Task Force 250 / PragerU',
                publication: 'YouTube (The White House)',
                url: 'youtube.com/watch?v=bBN3Dioq1js',
                date: '2025',
                image: '../units/early-republic/images/sources/founders-museum-franklin.png',
                description: 'An AI-generated video from the White House "Founders Museum" exhibit in which a digital Benjamin Franklin speaks directly to viewers. Franklin says he "captured lightning from the skies with the kite," quotes the famous "We must all hang together" line, and urges viewers to "guard" their inheritance. The video is presented without any disclaimer distinguishing historical record from invented dialogue.',
                reliable: false,
                explanation: 'This video uses AI to put words in a real historical figure\'s mouth. Franklin never recorded these exact sentences — the script was written in 2025 and performed by an AI voice. The "hang together" quote is disputed by historians (it first appeared in print decades after 1776). The claim that Franklin "captured lightning from the skies with the kite" presents a historically disputed event as fact. Most critically, there is no disclaimer telling viewers which words are documented quotes and which are invented. NPR, 404 Media, and UC Berkeley researchers flagged the Founders Museum videos for blurring the line between history and AI-generated fiction.',
                siftGuide: {
                    stop: 'An AI-generated historical figure "speaking" directly to you should raise immediate red flags. These are not Franklin\'s real words — someone wrote a script in 2025.',
                    investigate: 'The Founders Museum was created by PragerU (a conservative advocacy nonprofit) in partnership with the White House Task Force 250. PragerU is not a university and has a political mission. The White House is not a neutral educational institution.',
                    find: 'NPR reported that the videos blur history and AI-generated fiction. UC Berkeley\'s Hany Farid investigated the exhibit. 404 Media documented fabricated quotes across the video series, including an AI John Adams saying "facts do not care about your feelings" (a Ben Shapiro phrase from 2014).',
                    trace: 'Search Franklin\'s actual writings on Founders Online (founders.archives.gov). The exact sentences in this video do not appear in any historical record. The "hang together" quote has no contemporaneous documentation — it first appeared in Jared Sparks\' 1840 biography, 50+ years after the event.'
                }
            },
            {
                id: 'founders-online',
                title: 'Founders Online',
                subtitle: 'Correspondence and Other Writings of Seven Major Shapers of the United States',
                author: 'National Historical Publications and Records Commission',
                publication: 'National Archives (archives.gov)',
                url: 'founders.archives.gov',
                date: 'Ongoing since 2013',
                image: '../units/early-republic/images/sources/founders-online.png',
                description: 'A free database with over 184,000 searchable documents — original letters, speeches, and records from Washington, Jefferson, Hamilton, Adams, Franklin, Madison, and Jay.',
                reliable: true,
                explanation: 'This is a government-run scholarly project by the National Archives. Every document is transcribed from original manuscripts with full source citations. The .gov domain and nonpartisan mission make it highly credible.',
                siftGuide: {
                    stop: 'It\'s a .gov website from the National Archives — a federal agency. Worth checking further, but the domain is a good sign.',
                    investigate: 'The National Archives is a nonpartisan federal agency whose mission is preserving government records. The NHPRC has funded documentary editing since the 1950s.',
                    find: 'Other scholarly sites (Library of Congress, Mount Vernon, university history departments) link to and cite Founders Online as authoritative.',
                    trace: 'Every document includes editorial notes, original manuscript locations, and cross-references. You can trace any quote back to the original handwritten letter.'
                }
            },
            {
                id: 'mount-vernon',
                title: 'Digital Encyclopedia of George Washington',
                subtitle: 'Comprehensive resource on Washington\'s life, presidency, and legacy',
                author: 'Fred W. Smith National Library scholars',
                publication: 'George Washington\'s Mount Vernon (mountvernon.org)',
                url: 'mountvernon.org/library/digitalhistory/digital-encyclopedia',
                date: 'Ongoing, continuously updated',
                image: '../units/early-republic/images/sources/mount-vernon.png',
                description: 'Hundreds of encyclopedia entries covering Washington\'s life — military career, presidency, slavery, personal life — written by historians using primary sources from the Mount Vernon collection.',
                reliable: true,
                explanation: 'Mount Vernon is run by the Mount Vernon Ladies\' Association, preserving Washington\'s estate since 1858. Entries are written by professional historians. They even maintain a "Spurious Quotations" page debunking fake Washington quotes — a sign they care about accuracy over popularity.',
                siftGuide: {
                    stop: 'A .org site about George Washington. Could be reliable or not — need to investigate who runs it.',
                    investigate: 'Mount Vernon is a well-known historic site with a dedicated research library. It\'s nonpartisan and has been operating for over 165 years.',
                    find: 'The Smithsonian, Library of Congress, and university history departments regularly cite Mount Vernon\'s scholarship.',
                    trace: 'Entries cite primary source documents, and the library holds original Washington manuscripts for cross-reference.'
                }
            },
            {
                id: 'monticello-spurious',
                title: 'Spurious Quotations — Thomas Jefferson Encyclopedia',
                subtitle: 'Quotes falsely attributed to Thomas Jefferson',
                author: 'Thomas Jefferson Foundation research staff',
                publication: 'Thomas Jefferson\'s Monticello (monticello.org)',
                url: 'monticello.org/research-education/thomas-jefferson-encyclopedia/category/spurious-quotations/',
                date: 'Ongoing, 72+ entries',
                image: '../units/early-republic/images/sources/monticello-spurious.png',
                description: 'Catalogs dozens of quotes falsely attributed to Thomas Jefferson that circulate widely on the internet. For each quote, the page explains why it\'s fake — no evidence in Jefferson\'s writings, anachronistic language, traced to a different author, etc.',
                reliable: true,
                explanation: 'The Thomas Jefferson Foundation at Monticello is a nonpartisan nonprofit preserving Jefferson\'s home since 1923. Their research staff works with the Papers of Thomas Jefferson project at Princeton University. They have no incentive to debunk quotes other than commitment to historical accuracy.',
                siftGuide: {
                    stop: 'This page is specifically designed to fight misinformation — that\'s a good sign.',
                    investigate: 'Monticello is the preeminent Jefferson research institution, with direct access to his papers and estate.',
                    find: 'This spurious quotes page is frequently cited by fact-checkers, journalists, and historians as the go-to resource for verifying Jefferson quotes.',
                    trace: 'Each entry explains the research process — where they looked, what they found (or didn\'t find), and sometimes where the fake quote actually originated.'
                }
            },
            {
                id: 'quotefancy-washington',
                title: 'Top 450 George Washington Quotes (2026 Update)',
                subtitle: 'Shareable quote images attributed to George Washington',
                author: 'Unknown (no editorial staff credited)',
                publication: 'QuoteFancy (quotefancy.com)',
                url: 'quotefancy.com/george-washington',
                date: 'Undated',
                image: '../units/early-republic/images/sources/quotefancy-washington.png',
                description: 'Presents 450 quotes attributed to George Washington on shareable image cards. Includes quotes like "Government is not reason, it is not eloquence — it is force. Like fire, it is a dangerous servant and a fearful master."',
                reliable: false,
                explanation: 'The site provides zero source citations for any quote. The "government is not reason" quote is a documented fake — no one has found it in any Washington writing. It first appeared in 1902, over a century after his death. Mount Vernon\'s own spurious quotations page confirms it is false. The site\'s goal is generating shareable social media images, not historical accuracy.',
                siftGuide: {
                    stop: 'A quote site with no citations should raise immediate suspicion. Where did these quotes come from?',
                    investigate: 'QuoteFancy has no identified editorial staff, no historians, no fact-checking process. It\'s a content aggregation site designed for social media sharing.',
                    find: 'Mount Vernon\'s spurious quotations page directly contradicts several quotes found on QuoteFancy. Founders Online has searchable full-text of Washington\'s actual writings.',
                    trace: 'Try searching any quote in Founders Online (founders.archives.gov). The "government is not reason" quote returns zero results in Washington\'s papers.'
                }
            },
            {
                id: 'pinterest-founders',
                title: 'Founding Fathers Quotes',
                subtitle: 'Image-based quotes shared on social media',
                author: 'Various anonymous users',
                publication: 'Pinterest (pinterest.com)',
                url: 'pinterest.com/search/pins/?q=founding+fathers+quotes',
                date: 'Undated',
                image: '../units/early-republic/images/sources/pinterest-founders.png',
                description: 'A collection of image-based quotes attributed to founding fathers, shared as pins. Quotes appear on decorative backgrounds with no citations, no context, and no way to verify them.',
                reliable: false,
                explanation: 'Pinterest is a social media platform where anyone can post anything with no editorial oversight. Quote images are designed to be shared, not verified. The format (quote on a pretty background) gives a false sense of authority. Many founding father quotes circulating on Pinterest are documented fakes — including the Jefferson "educated citizenry" quote and the Washington "firearms" quote.',
                siftGuide: {
                    stop: 'Social media is never a primary source for historical quotes. Anyone can make a quote image and attribute it to anyone.',
                    investigate: 'Pinterest is a social media platform. The users who create these pins have no identified credentials or expertise in history.',
                    find: 'Compare any quote found here against Founders Online, Monticello\'s spurious quotes page, or Mount Vernon\'s spurious quotes page.',
                    trace: 'None of the images include citations to original documents. There is no way to trace any claim back to a primary source from the image alone.'
                }
            }
        ];
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        this._currentIndex = 0;
        this._answers = {};
        this._siftNotes = {};

        // Shuffle sources
        this._sources = this._getSources();
        for (var i = this._sources.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this._sources[i];
            this._sources[i] = this._sources[j];
            this._sources[j] = temp;
        }

        // Load saved stats
        var saved = ProgressManager.getActivityProgress(config.unit.id, 'sift-practice');
        if (saved) {
            this._stats.completed = saved.completed || 0;
            this._stats.bestScore = saved.bestScore || 0;
        }

        container.textContent = '';
        this._renderIntro();
    },

    _renderIntro() {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var wrapper = document.createElement('div');
        wrapper.className = 'sift-container';

        var heading = document.createElement('h2');
        heading.className = 'sift-heading';
        heading.textContent = 'SIFT Practice';
        wrapper.appendChild(heading);

        var desc = document.createElement('p');
        desc.className = 'sift-desc';
        desc.textContent = 'Can you tell a reliable source from a fake? You\'ll evaluate 6 real websites about the Early Republic. Use the SIFT method to decide which are trustworthy and which aren\'t.';
        wrapper.appendChild(desc);

        // SIFT method card
        var siftCard = document.createElement('div');
        siftCard.className = 'sift-method-card';

        var siftTitle = document.createElement('h3');
        siftTitle.className = 'sift-method-title';
        siftTitle.textContent = 'The SIFT Method';
        siftCard.appendChild(siftTitle);

        var steps = [
            { letter: 'S', word: 'Stop', desc: 'Pause before sharing or believing. What are you looking at?' },
            { letter: 'I', word: 'Investigate the source', desc: 'Who made this? What is their expertise and motivation?' },
            { letter: 'F', word: 'Find better coverage', desc: 'What do other reliable sources say about this claim?' },
            { letter: 'T', word: 'Trace claims', desc: 'Where did this information originally come from?' }
        ];

        steps.forEach(function(step) {
            var row = document.createElement('div');
            row.className = 'sift-step-row';

            var letter = document.createElement('span');
            letter.className = 'sift-step-letter';
            letter.textContent = step.letter;
            row.appendChild(letter);

            var content = document.createElement('div');
            content.className = 'sift-step-content';
            var bold = document.createElement('strong');
            bold.textContent = step.word;
            content.appendChild(bold);
            content.appendChild(document.createTextNode(' — ' + step.desc));
            row.appendChild(content);

            siftCard.appendChild(row);
        });

        wrapper.appendChild(siftCard);

        if (this._stats.completed > 0) {
            var statsEl = document.createElement('p');
            statsEl.className = 'sift-stats';
            statsEl.textContent = 'Sessions completed: ' + this._stats.completed + ' | Best score: ' + this._stats.bestScore + '/6';
            wrapper.appendChild(statsEl);
        }

        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button sift-start-btn';
        var startIcon = document.createElement('i');
        startIcon.className = 'fas fa-play';
        startBtn.appendChild(startIcon);
        startBtn.appendChild(document.createTextNode(' Start Evaluating'));
        startBtn.addEventListener('click', function() {
            self._currentIndex = 0;
            self._answers = {};
            self._siftNotes = {};
            self._renderSource();
        });
        wrapper.appendChild(startBtn);

        container.appendChild(wrapper);
    },

    _renderSource() {
        var container = this._container;
        container.textContent = '';
        var self = this;
        var source = this._sources[this._currentIndex];
        var total = this._sources.length;
        var idx = this._currentIndex;

        var wrapper = document.createElement('div');
        wrapper.className = 'sift-container';

        // Progress
        var progressRow = document.createElement('div');
        progressRow.className = 'sift-progress-row';
        var progressText = document.createElement('span');
        progressText.className = 'sift-progress-text';
        progressText.textContent = 'Source ' + (idx + 1) + ' of ' + total;
        progressRow.appendChild(progressText);
        var progressBar = document.createElement('div');
        progressBar.className = 'sift-progress-bar';
        var progressFill = document.createElement('div');
        progressFill.className = 'sift-progress-fill';
        progressFill.style.width = Math.round(((idx + 1) / total) * 100) + '%';
        progressBar.appendChild(progressFill);
        progressRow.appendChild(progressBar);
        wrapper.appendChild(progressRow);

        // Source card
        var card = document.createElement('div');
        card.className = 'sift-source-card';

        // Screenshot
        var imgWrap = document.createElement('div');
        imgWrap.className = 'sift-source-img';
        var img = document.createElement('img');
        img.src = source.image;
        img.alt = source.title;
        img.loading = 'lazy';
        img.addEventListener('error', function() {
            imgWrap.style.display = 'none';
        });
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);

        // Source metadata
        var meta = document.createElement('div');
        meta.className = 'sift-source-meta';

        var title = document.createElement('h3');
        title.className = 'sift-source-title';
        title.textContent = source.title;
        meta.appendChild(title);

        if (source.subtitle) {
            var subtitle = document.createElement('p');
            subtitle.className = 'sift-source-subtitle';
            subtitle.textContent = source.subtitle;
            meta.appendChild(subtitle);
        }

        var details = [
            { icon: 'fas fa-user', label: 'Author', value: source.author },
            { icon: 'fas fa-globe', label: 'Website', value: source.publication },
            { icon: 'fas fa-link', label: 'URL', value: source.url },
            { icon: 'fas fa-calendar', label: 'Date', value: source.date }
        ];

        var detailsGrid = document.createElement('div');
        detailsGrid.className = 'sift-details-grid';
        details.forEach(function(d) {
            var row = document.createElement('div');
            row.className = 'sift-detail-row';
            var icon = document.createElement('i');
            icon.className = d.icon;
            row.appendChild(icon);
            var label = document.createElement('span');
            label.className = 'sift-detail-label';
            label.textContent = d.label + ': ';
            row.appendChild(label);
            var value;
            if (d.label === 'URL') {
                value = document.createElement('a');
                value.className = 'sift-detail-value sift-detail-link';
                value.textContent = d.value;
                value.href = 'https://' + d.value;
                value.target = '_blank';
                value.rel = 'noopener noreferrer';
            } else {
                value = document.createElement('span');
                value.className = 'sift-detail-value';
                value.textContent = d.value;
            }
            row.appendChild(value);
            detailsGrid.appendChild(row);
        });
        meta.appendChild(detailsGrid);

        var descEl = document.createElement('p');
        descEl.className = 'sift-source-desc';
        descEl.textContent = source.description;
        meta.appendChild(descEl);

        card.appendChild(meta);
        wrapper.appendChild(card);

        // SIFT walkthrough — collapsible guided notes
        var siftSection = document.createElement('div');
        siftSection.className = 'sift-walkthrough';

        var siftHeading = document.createElement('h4');
        siftHeading.className = 'sift-walkthrough-heading';
        siftHeading.textContent = 'Work through SIFT:';
        siftSection.appendChild(siftHeading);

        var siftSteps = [
            { key: 'stop', letter: 'S', word: 'Stop', prompt: 'What is your first impression? What kind of source is this?' },
            { key: 'investigate', letter: 'I', word: 'Investigate', prompt: 'Who created this? What are their credentials or motivation?' },
            { key: 'find', letter: 'F', word: 'Find', prompt: 'Do other reliable sources confirm or contradict this?' },
            { key: 'trace', letter: 'T', word: 'Trace', prompt: 'Can you trace the claims back to original evidence?' }
        ];

        var noteKey = source.id;
        if (!self._siftNotes[noteKey]) self._siftNotes[noteKey] = {};

        siftSteps.forEach(function(step) {
            var stepDiv = document.createElement('div');
            stepDiv.className = 'sift-wt-step';

            var stepHeader = document.createElement('div');
            stepHeader.className = 'sift-wt-header';
            var letterBadge = document.createElement('span');
            letterBadge.className = 'sift-wt-letter';
            letterBadge.textContent = step.letter;
            stepHeader.appendChild(letterBadge);
            var stepLabel = document.createElement('span');
            stepLabel.className = 'sift-wt-label';
            stepLabel.textContent = step.word + ': ' + step.prompt;
            stepHeader.appendChild(stepLabel);
            stepDiv.appendChild(stepHeader);

            var textarea = document.createElement('textarea');
            textarea.className = 'sift-wt-textarea';
            textarea.placeholder = 'Your notes...';
            textarea.rows = 2;
            textarea.value = self._siftNotes[noteKey][step.key] || '';
            textarea.addEventListener('input', function() {
                self._siftNotes[noteKey][step.key] = textarea.value;
            });
            stepDiv.appendChild(textarea);

            siftSection.appendChild(stepDiv);
        });

        wrapper.appendChild(siftSection);

        // Verdict buttons
        var verdictSection = document.createElement('div');
        verdictSection.className = 'sift-verdict-section';

        var verdictLabel = document.createElement('h4');
        verdictLabel.className = 'sift-verdict-label';
        verdictLabel.textContent = 'Your verdict: Is this source reliable?';
        verdictSection.appendChild(verdictLabel);

        var btnRow = document.createElement('div');
        btnRow.className = 'sift-verdict-btns';

        var reliableBtn = document.createElement('button');
        reliableBtn.className = 'sift-verdict-btn sift-btn-reliable';
        if (self._answers[idx] === true) reliableBtn.classList.add('selected');
        var reliableIcon = document.createElement('i');
        reliableIcon.className = 'fas fa-check-circle';
        reliableBtn.appendChild(reliableIcon);
        reliableBtn.appendChild(document.createTextNode(' Reliable'));
        reliableBtn.addEventListener('click', function() {
            self._answers[idx] = true;
            self._renderSource();
        });
        btnRow.appendChild(reliableBtn);

        var unreliableBtn = document.createElement('button');
        unreliableBtn.className = 'sift-verdict-btn sift-btn-unreliable';
        if (self._answers[idx] === false) unreliableBtn.classList.add('selected');
        var unreliableIcon = document.createElement('i');
        unreliableIcon.className = 'fas fa-times-circle';
        unreliableBtn.appendChild(unreliableIcon);
        unreliableBtn.appendChild(document.createTextNode(' Unreliable'));
        unreliableBtn.addEventListener('click', function() {
            self._answers[idx] = false;
            self._renderSource();
        });
        btnRow.appendChild(unreliableBtn);

        verdictSection.appendChild(btnRow);
        wrapper.appendChild(verdictSection);

        // Navigation
        var navRow = document.createElement('div');
        navRow.className = 'sift-nav-row';

        if (idx > 0) {
            var prevBtn = document.createElement('button');
            prevBtn.className = 'nav-button sift-nav-btn';
            var prevIcon = document.createElement('i');
            prevIcon.className = 'fas fa-arrow-left';
            prevBtn.appendChild(prevIcon);
            prevBtn.appendChild(document.createTextNode(' Previous'));
            prevBtn.addEventListener('click', function() {
                self._currentIndex--;
                self._renderSource();
            });
            navRow.appendChild(prevBtn);
        } else {
            navRow.appendChild(document.createElement('span'));
        }

        if (idx < total - 1) {
            var nextBtn = document.createElement('button');
            nextBtn.className = 'nav-button sift-nav-btn';
            nextBtn.appendChild(document.createTextNode('Next '));
            var nextIcon = document.createElement('i');
            nextIcon.className = 'fas fa-arrow-right';
            nextBtn.appendChild(nextIcon);
            if (self._answers[idx] === undefined) nextBtn.classList.add('sift-btn-disabled');
            nextBtn.addEventListener('click', function() {
                if (self._answers[idx] === undefined) return;
                self._currentIndex++;
                self._renderSource();
            });
            navRow.appendChild(nextBtn);
        } else {
            var finishBtn = document.createElement('button');
            finishBtn.className = 'nav-button sift-nav-btn sift-finish-btn';
            var finishIcon = document.createElement('i');
            finishIcon.className = 'fas fa-flag-checkered';
            finishBtn.appendChild(finishIcon);
            finishBtn.appendChild(document.createTextNode(' See Results'));
            if (self._answers[idx] === undefined) finishBtn.classList.add('sift-btn-disabled');
            finishBtn.addEventListener('click', function() {
                if (self._answers[idx] === undefined) return;
                self._renderResults();
            });
            navRow.appendChild(finishBtn);
        }

        wrapper.appendChild(navRow);
        container.appendChild(wrapper);

        // Scroll to top
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _renderResults() {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var wrapper = document.createElement('div');
        wrapper.className = 'sift-container';

        var heading = document.createElement('h2');
        heading.className = 'sift-heading';
        heading.textContent = 'Results';
        wrapper.appendChild(heading);

        // Calculate score
        var correct = 0;
        for (var i = 0; i < this._sources.length; i++) {
            if (this._answers[i] === this._sources[i].reliable) correct++;
        }
        var total = this._sources.length;
        var pct = Math.round((correct / total) * 100);

        var scoreDiv = document.createElement('div');
        scoreDiv.className = 'sift-score';
        var scoreBig = document.createElement('div');
        scoreBig.className = 'sift-score-big';
        scoreBig.style.color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning, #f59e0b)' : 'var(--error)';
        scoreBig.textContent = correct + '/' + total + ' correct';
        scoreDiv.appendChild(scoreBig);

        if (correct === total) {
            var perfectMsg = document.createElement('div');
            perfectMsg.className = 'sift-perfect';
            perfectMsg.textContent = 'Perfect! You\'re a SIFT expert!';
            scoreDiv.appendChild(perfectMsg);
        }
        wrapper.appendChild(scoreDiv);

        // Individual results
        var resultsList = document.createElement('div');
        resultsList.className = 'sift-results-list';

        this._sources.forEach(function(source, i) {
            var isCorrect = self._answers[i] === source.reliable;

            var card = document.createElement('div');
            card.className = 'sift-result-card ' + (isCorrect ? 'sift-result-correct' : 'sift-result-wrong');

            // Header row
            var headerRow = document.createElement('div');
            headerRow.className = 'sift-result-header';

            var resultIcon = document.createElement('i');
            resultIcon.className = isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
            resultIcon.style.color = isCorrect ? 'var(--success)' : 'var(--error)';
            headerRow.appendChild(resultIcon);

            var titleEl = document.createElement('span');
            titleEl.className = 'sift-result-title';
            titleEl.textContent = source.title;
            headerRow.appendChild(titleEl);

            var badge = document.createElement('span');
            badge.className = 'sift-result-badge ' + (source.reliable ? 'sift-badge-reliable' : 'sift-badge-unreliable');
            badge.textContent = source.reliable ? 'Reliable' : 'Unreliable';
            headerRow.appendChild(badge);

            card.appendChild(headerRow);

            // Your answer vs correct
            if (!isCorrect) {
                var yourAnswer = document.createElement('div');
                yourAnswer.className = 'sift-your-answer';
                yourAnswer.textContent = 'You said: ' + (self._answers[i] ? 'Reliable' : 'Unreliable');
                card.appendChild(yourAnswer);
            }

            // Explanation
            var explEl = document.createElement('div');
            explEl.className = 'sift-result-explanation';
            explEl.textContent = source.explanation;
            card.appendChild(explEl);

            // SIFT breakdown (collapsible)
            var detailBtn = document.createElement('button');
            detailBtn.className = 'sift-detail-toggle';
            var detailBtnIcon = document.createElement('i');
            detailBtnIcon.className = 'fas fa-chevron-down';
            detailBtn.appendChild(detailBtnIcon);
            detailBtn.appendChild(document.createTextNode(' SIFT Breakdown'));

            var detailDiv = document.createElement('div');
            detailDiv.className = 'sift-detail-breakdown';
            detailDiv.style.display = 'none';

            var siftSteps = [
                { letter: 'S', word: 'Stop', text: source.siftGuide.stop },
                { letter: 'I', word: 'Investigate', text: source.siftGuide.investigate },
                { letter: 'F', word: 'Find', text: source.siftGuide.find },
                { letter: 'T', word: 'Trace', text: source.siftGuide.trace }
            ];

            siftSteps.forEach(function(step) {
                var stepRow = document.createElement('div');
                stepRow.className = 'sift-breakdown-step';
                var letterEl = document.createElement('span');
                letterEl.className = 'sift-breakdown-letter';
                letterEl.textContent = step.letter;
                stepRow.appendChild(letterEl);
                var textEl = document.createElement('div');
                var boldEl = document.createElement('strong');
                boldEl.textContent = step.word + ': ';
                textEl.appendChild(boldEl);
                textEl.appendChild(document.createTextNode(step.text));
                stepRow.appendChild(textEl);
                detailDiv.appendChild(stepRow);
            });

            // Show student's notes if they wrote any
            var noteKey = source.id;
            if (self._siftNotes[noteKey]) {
                var hasNotes = Object.values(self._siftNotes[noteKey]).some(function(v) { return v && v.trim(); });
                if (hasNotes) {
                    var notesHeading = document.createElement('div');
                    notesHeading.className = 'sift-your-notes-heading';
                    notesHeading.textContent = 'Your notes:';
                    detailDiv.appendChild(notesHeading);

                    ['stop', 'investigate', 'find', 'trace'].forEach(function(key, ki) {
                        var note = self._siftNotes[noteKey][key];
                        if (note && note.trim()) {
                            var noteRow = document.createElement('div');
                            noteRow.className = 'sift-your-note';
                            noteRow.textContent = siftSteps[ki].letter + ': ' + note.trim();
                            detailDiv.appendChild(noteRow);
                        }
                    });
                }
            }

            detailBtn.addEventListener('click', function() {
                var showing = detailDiv.style.display !== 'none';
                detailDiv.style.display = showing ? 'none' : 'block';
                detailBtnIcon.className = showing ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            });

            card.appendChild(detailBtn);
            card.appendChild(detailDiv);
            resultsList.appendChild(card);
        });

        wrapper.appendChild(resultsList);

        // Save progress
        this._stats.completed++;
        if (correct > this._stats.bestScore) this._stats.bestScore = correct;
        ProgressManager.saveActivityProgress(this._config.unit.id, 'sift-practice', {
            completed: this._stats.completed,
            bestScore: this._stats.bestScore
        });

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'sift-practice', score: pct, event: correct === total ? 'perfect' : 'complete' });
        }

        // Try again button
        var btnRow = document.createElement('div');
        btnRow.className = 'sift-nav-row';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'nav-button sift-nav-btn';
        var retryIcon = document.createElement('i');
        retryIcon.className = 'fas fa-redo';
        retryBtn.appendChild(retryIcon);
        retryBtn.appendChild(document.createTextNode(' Try Again'));
        retryBtn.addEventListener('click', function() {
            self.render(self._container, self._config);
        });
        btnRow.appendChild(retryBtn);
        wrapper.appendChild(btnRow);

        container.appendChild(wrapper);
    },

    activate() {},
    deactivate() {},
    getProgress() { return null; },
    loadProgress(data) {
        if (data) {
            this._stats.completed = data.completed || 0;
            this._stats.bestScore = data.bestScore || 0;
        }
    }
});
