StudyEngine.registerActivity({
    id: 'source-analysis',
    name: 'Source Analysis',
    icon: 'fas fa-scroll',
    description: 'Identify primary vs. secondary sources and analyze historical documents',
    category: 'practice',
    requires: ['vocabulary'],

    _sources: [],
    _currentIndex: 0,
    _score: 0,
    _total: 0,
    _answered: false,
    _showingQuestions: false,
    _questionIndex: 0,
    _questionScore: 0,
    _container: null,
    _config: null,
    _results: [],

    _getSourceData() {
        return [
            {
                title: "Washington's Farewell Address",
                creator: "George Washington",
                year: 1796,
                type: "primary",
                format: "speech",
                excerpt: "\"I have already intimated to you the danger of parties in the State... Let me now take a more comprehensive view, and warn you in the most solemn manner against the baneful effects of the spirit of party generally.\"",
                context: "Published in newspapers across the country as Washington prepared to leave office after two terms.",
                questions: [
                    {
                        question: "What is Washington warning Americans about in this excerpt?",
                        options: ["The dangers of political parties", "The need for a stronger military", "The importance of foreign alliances", "The threat of British invasion"],
                        correct: 0
                    },
                    {
                        question: "Why is this considered a primary source?",
                        options: ["It was written by a historian", "It was created by someone who lived during the event", "It contains facts about history", "It is very old"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Letter to John Adams",
                creator: "Thomas Jefferson",
                year: 1796,
                type: "primary",
                format: "letter",
                excerpt: "\"The second office of this government is honorable and easy, the first is but a splendid misery.\"",
                context: "Jefferson wrote this private letter to Adams as they competed in the 1796 presidential election.",
                questions: [
                    {
                        question: "What does Jefferson mean by calling the presidency 'a splendid misery'?",
                        options: ["The president gets paid too little", "The job is prestigious but burdensome", "The White House is uncomfortable", "Presidents are not respected"],
                        correct: 1
                    },
                    {
                        question: "What makes a personal letter a valuable primary source?",
                        options: ["Letters are always accurate", "They reveal private thoughts of people from that time", "Letters are written by professional writers", "They are easy to read"],
                        correct: 1
                    }
                ]
            },
            {
                title: "The Alien and Sedition Acts",
                creator: "United States Congress",
                year: 1798,
                type: "primary",
                format: "law",
                excerpt: "\"If any person shall write, print, utter, or publish... any false, scandalous and malicious writing or writings against the government of the United States... shall be punished by a fine not exceeding two thousand dollars, and by imprisonment not exceeding two years.\"",
                context: "Passed by Congress under President John Adams during tensions with France, these laws restricted speech critical of the government.",
                questions: [
                    {
                        question: "Which right protected by the First Amendment did the Sedition Act threaten?",
                        options: ["Freedom of religion", "Right to bear arms", "Freedom of speech and press", "Right to a fair trial"],
                        correct: 2
                    },
                    {
                        question: "Why would a historian want to read the actual text of this law rather than just a summary?",
                        options: ["Summaries are always wrong", "The original text shows exactly what was banned and the specific punishments", "Old documents are more interesting", "Historians only use primary sources"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Hamilton's Financial Plan: Report on Public Credit",
                creator: "Alexander Hamilton",
                year: 1790,
                type: "primary",
                format: "government report",
                excerpt: "\"The debt of the United States... was the price of liberty. The faith of America has been repeatedly pledged for it... Among ourselves, the most enlightened friends of good government are those whose expectations are the highest.\"",
                context: "Hamilton presented this report to Congress proposing that the federal government assume all state debts from the Revolutionary War.",
                questions: [
                    {
                        question: "How does Hamilton justify taking on the national debt?",
                        options: ["He says debt doesn't matter", "He calls it 'the price of liberty' — a cost of winning independence", "He blames the states for spending too much", "He says Britain should pay it"],
                        correct: 1
                    },
                    {
                        question: "Who opposed Hamilton's financial plan?",
                        options: ["George Washington", "John Adams", "Thomas Jefferson and James Madison", "Benjamin Franklin"],
                        correct: 2
                    }
                ]
            },
            {
                title: "Kentucky Resolution",
                creator: "Thomas Jefferson (written anonymously)",
                year: 1798,
                type: "primary",
                format: "political resolution",
                excerpt: "\"Resolved, that the several States composing the United States of America, are not united on the principle of unlimited submission to their General Government... whensoever the General Government assumes undelegated powers, its acts are unauthoritative, void, and of no force.\"",
                context: "Jefferson secretly wrote this resolution for the Kentucky legislature to protest the Alien and Sedition Acts, arguing states could nullify federal laws.",
                questions: [
                    {
                        question: "What principle is Jefferson arguing for in this resolution?",
                        options: ["The federal government has unlimited power", "States have the right to reject federal laws they consider unconstitutional", "All laws must be obeyed without question", "Only the president can decide what is constitutional"],
                        correct: 1
                    },
                    {
                        question: "Why did Jefferson write this anonymously?",
                        options: ["He was not a good writer", "As Vice President, openly opposing federal law would be controversial", "He didn't care about the issue", "It was required by law"],
                        correct: 1
                    }
                ]
            },
            {
                title: "A Textbook Chapter: 'The First Party System'",
                creator: "Modern history textbook",
                year: 2020,
                type: "secondary",
                format: "textbook",
                excerpt: "\"The rivalry between Hamilton and Jefferson laid the foundation for America's first political parties. Hamilton's Federalists favored a strong central government and close ties with Britain, while Jefferson's Democratic-Republicans championed states' rights and sympathized with France.\"",
                context: "Written by historians for students, summarizing and interpreting events that happened over 200 years ago.",
                questions: [
                    {
                        question: "Why is a modern textbook considered a secondary source?",
                        options: ["It is printed on paper", "It was written long after the events by someone who wasn't there", "It contains incorrect information", "It is used in schools"],
                        correct: 1
                    },
                    {
                        question: "What is one advantage of using a secondary source like a textbook?",
                        options: ["It gives you the exact words of historical figures", "It organizes and explains events using evidence from many primary sources", "It is always completely unbiased", "It replaces the need for primary sources"],
                        correct: 1
                    }
                ]
            },
            {
                title: "A Documentary Film: 'The Duel — Hamilton vs. Burr'",
                creator: "History Channel",
                year: 2015,
                type: "secondary",
                format: "documentary",
                excerpt: "\"The bitter rivalry between Alexander Hamilton and Aaron Burr culminated in one of the most famous duels in American history. On July 11, 1804, the two men met on the dueling grounds at Weehawken, New Jersey...\"",
                context: "A modern documentary using dramatic reenactments, expert interviews, and historical evidence to tell the story.",
                questions: [
                    {
                        question: "What makes this documentary a secondary source rather than a primary source?",
                        options: ["It uses video instead of text", "It was created long after the events by people who researched them", "It mentions real historical figures", "It is entertaining"],
                        correct: 1
                    },
                    {
                        question: "How might a documentary be useful even though it's a secondary source?",
                        options: ["Documentaries are always 100% accurate", "They can make complex historical events easier to understand", "They replace the need to study", "They are more important than primary sources"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Political Cartoon: 'The Congressional Pugilists'",
                creator: "Unknown artist",
                year: 1798,
                type: "primary",
                format: "political cartoon",
                excerpt: "[A political cartoon showing Congressman Matthew Lyon and Roger Griswold fighting on the floor of Congress with a fireplace poker and cane while other members watch]",
                context: "This cartoon depicted an actual fight that broke out in Congress in 1798 between a Federalist and a Democratic-Republican, showing how divided the nation's leaders had become.",
                questions: [
                    {
                        question: "What does this cartoon reveal about politics in the Early Republic?",
                        options: ["Congress was always peaceful", "Political disagreements were so intense they sometimes turned violent", "Everyone agreed on major issues", "Congressmen enjoyed exercise"],
                        correct: 1
                    },
                    {
                        question: "Even though we don't know the artist, why is this still a primary source?",
                        options: ["Because it is a drawing", "Because it was created during the time period it depicts", "Because it is funny", "Because it is in a museum"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Abigail Adams's Letter to John Adams",
                creator: "Abigail Adams",
                year: 1797,
                type: "primary",
                format: "letter",
                excerpt: "\"I feel not any personal uneasiness at the prospect of being First Lady... My ambition leads me not to be first in Rome. I am content to be second, but I claim my right to think and act for myself.\"",
                context: "Abigail Adams wrote frequently to her husband, offering political advice and sharing her views on the new nation.",
                questions: [
                    {
                        question: "What does this letter reveal about Abigail Adams?",
                        options: ["She was uninterested in politics", "She was independent-minded and had her own political opinions", "She wanted to be president herself", "She didn't support her husband"],
                        correct: 1
                    },
                    {
                        question: "Why are personal letters especially valuable to historians?",
                        options: ["They are written in fancy handwriting", "They show private thoughts that people might not express publicly", "They are always truthful", "They are short and easy to read"],
                        correct: 1
                    }
                ]
            },
            {
                title: "A Historian's Article: 'Was the Whiskey Rebellion Justified?'",
                creator: "Dr. Sarah Mitchell, University of Virginia",
                year: 2019,
                type: "secondary",
                format: "journal article",
                excerpt: "\"The farmers of western Pennsylvania had legitimate grievances against Hamilton's excise tax, which disproportionately burdened small producers. However, Washington's decision to march 13,000 troops demonstrated that the new federal government would enforce its laws — a critical precedent for national authority.\"",
                context: "A modern historian analyzes the Whiskey Rebellion using primary sources, letters, and government records to argue her interpretation.",
                questions: [
                    {
                        question: "What makes this article a secondary source?",
                        options: ["It is written by a professor", "It analyzes and interprets events using evidence gathered long after they occurred", "It is published in a journal", "It mentions the Whiskey Rebellion"],
                        correct: 1
                    },
                    {
                        question: "The historian presents multiple perspectives. Why is this important?",
                        options: ["It makes the article longer", "It helps readers understand the complexity of historical events", "Historians are required to by law", "It proves one side was right"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Treaty of Greenville",
                creator: "United States Government and Native American Nations",
                year: 1795,
                type: "primary",
                format: "treaty",
                excerpt: "\"The Indian tribes who have a right to those lands, are quietly to enjoy them, hunting, planting, and dwelling thereon so long as they please, without any molestation from the United States.\"",
                context: "This treaty was signed after the Battle of Fallen Timbers, forcing Native American nations to give up most of present-day Ohio to the United States.",
                questions: [
                    {
                        question: "What contradiction do you notice between the treaty's language and its actual effect?",
                        options: ["There is no contradiction", "The treaty promises peace while actually taking Native American land", "The treaty gave land back to Native Americans", "The treaty was never signed"],
                        correct: 1
                    },
                    {
                        question: "Why is it important to read the actual words of a treaty rather than just a summary?",
                        options: ["Treaties use complicated language that is fun to read", "You can see how the language may have been used to disguise unfair terms", "Summaries are always biased", "Treaties are always fair"],
                        correct: 1
                    }
                ]
            },
            {
                title: "The Star-Spangled Banner",
                creator: "Francis Scott Key",
                year: 1814,
                type: "primary",
                format: "poem",
                excerpt: "\"O say can you see, by the dawn's early light, / What so proudly we hail'd at the twilight's last gleaming, / Whose broad stripes and bright stars through the perilous fight / O'er the ramparts we watch'd were so gallantly streaming?\"",
                context: "Francis Scott Key wrote this poem after witnessing the British bombardment of Fort McHenry during the War of 1812. It later became the national anthem.",
                questions: [
                    {
                        question: "What event inspired Francis Scott Key to write this poem?",
                        options: ["The signing of the Constitution", "The British bombardment of Fort McHenry", "Washington's inauguration", "The Boston Tea Party"],
                        correct: 1
                    },
                    {
                        question: "A poem can be a primary source because:",
                        options: ["All poems are primary sources", "It was created by someone who witnessed the event firsthand", "Poems are always historically accurate", "It rhymes"],
                        correct: 1
                    }
                ]
            }
        ];
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        this._sources = this._getSourceData();
        this._currentIndex = 0;
        this._score = 0;
        this._total = 0;
        this._results = [];

        // Shuffle sources
        for (var i = this._sources.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = this._sources[i];
            this._sources[i] = this._sources[j];
            this._sources[j] = tmp;
        }

        // Load saved stats
        var saved = ProgressManager.getActivityProgress(config.unit.id, 'source-analysis');
        if (saved) {
            this._stats = { completed: saved.completed || 0, bestScore: saved.bestScore || 0 };
        } else {
            this._stats = { completed: 0, bestScore: 0 };
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'source-analysis-container';
        wrapper.id = 'source-wrapper';
        container.appendChild(wrapper);

        this._showIntro();
    },

    _showIntro() {
        var wrapper = document.getElementById('source-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var intro = document.createElement('div');
        intro.className = 'source-intro';

        var icon = document.createElement('i');
        icon.className = 'fas fa-scroll';
        icon.style.fontSize = '3em';
        icon.style.color = 'var(--primary)';
        icon.style.marginBottom = '15px';
        intro.appendChild(icon);

        var title = document.createElement('h2');
        title.textContent = 'Source Analysis';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '10px';
        intro.appendChild(title);

        var desc = document.createElement('p');
        desc.style.color = '#555';
        desc.style.marginBottom = '20px';
        desc.style.lineHeight = '1.6';
        desc.textContent = 'Examine historical sources from the Early Republic. For each source, decide if it is a primary source (created during the time period) or a secondary source (created later by someone studying the events). Then answer comprehension questions to deepen your understanding.';
        intro.appendChild(desc);

        // SIFT method card
        var sift = document.createElement('div');
        sift.className = 'source-sift-card';

        var siftTitle = document.createElement('h3');
        siftTitle.textContent = 'Use the SIFT Method';
        siftTitle.style.color = 'var(--primary)';
        siftTitle.style.marginBottom = '10px';
        sift.appendChild(siftTitle);

        var steps = [
            { letter: 'S', word: 'Stop', desc: 'Pause before reacting. What are you looking at?' },
            { letter: 'I', word: 'Investigate', desc: 'Who created this source? What is their perspective?' },
            { letter: 'F', word: 'Find', desc: 'Can you find other sources that confirm this information?' },
            { letter: 'T', word: 'Trace', desc: 'Where did this source originally come from?' }
        ];

        var self = this;
        steps.forEach(function(step) {
            var row = document.createElement('div');
            row.className = 'source-sift-step';

            var letter = document.createElement('span');
            letter.className = 'source-sift-letter';
            letter.textContent = step.letter;
            row.appendChild(letter);

            var content = document.createElement('div');
            var bold = document.createElement('strong');
            bold.textContent = step.word + ': ';
            content.appendChild(bold);
            content.appendChild(document.createTextNode(step.desc));
            row.appendChild(content);

            sift.appendChild(row);
        });

        intro.appendChild(sift);

        if (this._stats.completed > 0) {
            var statsEl = document.createElement('p');
            statsEl.style.color = '#999';
            statsEl.style.fontSize = '0.9em';
            statsEl.style.marginTop = '10px';
            statsEl.textContent = 'Sessions completed: ' + this._stats.completed + ' | Best score: ' + this._stats.bestScore + '%';
            intro.appendChild(statsEl);
        }

        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button';
        startBtn.style.marginTop = '20px';
        startBtn.style.background = 'var(--primary)';
        startBtn.style.color = 'white';
        startBtn.style.fontSize = '1.1em';
        startBtn.style.padding = '12px 30px';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-search';
        startBtn.appendChild(btnIcon);
        startBtn.appendChild(document.createTextNode(' Begin Analysis'));
        startBtn.addEventListener('click', function() { self._showSource(); });
        intro.appendChild(startBtn);

        wrapper.appendChild(intro);
    },

    _showSource() {
        if (this._currentIndex >= this._sources.length) {
            this._showFinalResults();
            return;
        }

        this._answered = false;
        this._showingQuestions = false;
        this._questionIndex = 0;
        this._questionScore = 0;

        var wrapper = document.getElementById('source-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var source = this._sources[this._currentIndex];

        // Progress bar
        var progressBar = document.createElement('div');
        progressBar.className = 'source-progress';
        var progressFill = document.createElement('div');
        progressFill.className = 'source-progress-fill';
        progressFill.style.width = ((this._currentIndex / this._sources.length) * 100) + '%';
        progressBar.appendChild(progressFill);
        wrapper.appendChild(progressBar);

        var progressText = document.createElement('div');
        progressText.className = 'source-progress-text';
        progressText.textContent = 'Source ' + (this._currentIndex + 1) + ' of ' + this._sources.length;
        wrapper.appendChild(progressText);

        // Source card
        var card = document.createElement('div');
        card.className = 'source-card';

        // Format badge
        var badge = document.createElement('span');
        badge.className = 'source-format-badge';
        badge.textContent = source.format.charAt(0).toUpperCase() + source.format.slice(1);
        card.appendChild(badge);

        // Title
        var titleEl = document.createElement('h2');
        titleEl.className = 'source-title';
        titleEl.textContent = source.title;
        card.appendChild(titleEl);

        // Meta info
        var meta = document.createElement('div');
        meta.className = 'source-meta';

        var creatorEl = document.createElement('span');
        var creatorIcon = document.createElement('i');
        creatorIcon.className = 'fas fa-user';
        creatorEl.appendChild(creatorIcon);
        creatorEl.appendChild(document.createTextNode(' ' + source.creator));
        meta.appendChild(creatorEl);

        var yearEl = document.createElement('span');
        var yearIcon = document.createElement('i');
        yearIcon.className = 'fas fa-calendar';
        yearEl.appendChild(yearIcon);
        yearEl.appendChild(document.createTextNode(' ' + source.year));
        meta.appendChild(yearEl);

        card.appendChild(meta);

        // Image (if available)
        if (source.image) {
            var imgWrap = document.createElement('div');
            imgWrap.className = 'source-image-wrap';
            var img = document.createElement('img');
            img.className = 'source-image';
            img.src = '../units/' + this._config.unit.id + '/images/sources/' + source.image;
            img.alt = source.title;
            img.loading = 'lazy';
            imgWrap.appendChild(img);
            card.appendChild(imgWrap);
        }

        // Excerpt
        var excerptBox = document.createElement('div');
        excerptBox.className = 'source-excerpt';

        if (source.format === 'political cartoon') {
            var cartoonNote = document.createElement('div');
            cartoonNote.className = 'source-cartoon-desc';
            var eyeIcon = document.createElement('i');
            eyeIcon.className = 'fas fa-image';
            cartoonNote.appendChild(eyeIcon);
            cartoonNote.appendChild(document.createTextNode(' Visual Source'));
            excerptBox.appendChild(cartoonNote);
        }

        var excerptText = document.createElement('p');
        excerptText.textContent = source.excerpt;
        if (source.format !== 'political cartoon') {
            excerptText.style.fontStyle = 'italic';
        }
        excerptBox.appendChild(excerptText);

        card.appendChild(excerptBox);

        // Context
        var contextBox = document.createElement('div');
        contextBox.className = 'source-context';
        var contextLabel = document.createElement('strong');
        contextLabel.textContent = 'Historical Context: ';
        contextBox.appendChild(contextLabel);
        contextBox.appendChild(document.createTextNode(source.context));
        card.appendChild(contextBox);

        wrapper.appendChild(card);

        // Classification prompt
        var prompt = document.createElement('div');
        prompt.className = 'source-classify-prompt';

        var promptText = document.createElement('h3');
        promptText.textContent = 'Is this a primary or secondary source?';
        prompt.appendChild(promptText);

        var btnRow = document.createElement('div');
        btnRow.className = 'source-classify-buttons';

        var self = this;

        var primaryBtn = document.createElement('button');
        primaryBtn.className = 'source-classify-btn primary-btn';
        primaryBtn.id = 'classify-primary';
        var pIcon = document.createElement('i');
        pIcon.className = 'fas fa-landmark';
        primaryBtn.appendChild(pIcon);
        var pTextWrap = document.createElement('div');
        var pLabel = document.createElement('div');
        pLabel.style.fontWeight = '700';
        pLabel.textContent = 'Primary Source';
        pTextWrap.appendChild(pLabel);
        var pDesc = document.createElement('div');
        pDesc.style.fontSize = '0.8em';
        pDesc.style.opacity = '0.8';
        pDesc.textContent = 'Created during the time period';
        pTextWrap.appendChild(pDesc);
        primaryBtn.appendChild(pTextWrap);
        primaryBtn.addEventListener('click', function() { self._classifySource('primary'); });
        btnRow.appendChild(primaryBtn);

        var secondaryBtn = document.createElement('button');
        secondaryBtn.className = 'source-classify-btn secondary-btn';
        secondaryBtn.id = 'classify-secondary';
        var sIcon = document.createElement('i');
        sIcon.className = 'fas fa-book';
        secondaryBtn.appendChild(sIcon);
        var sTextWrap = document.createElement('div');
        var sLabel = document.createElement('div');
        sLabel.style.fontWeight = '700';
        sLabel.textContent = 'Secondary Source';
        sTextWrap.appendChild(sLabel);
        var sDesc = document.createElement('div');
        sDesc.style.fontSize = '0.8em';
        sDesc.style.opacity = '0.8';
        sDesc.textContent = 'Created later by someone studying events';
        sTextWrap.appendChild(sDesc);
        secondaryBtn.appendChild(sTextWrap);
        secondaryBtn.addEventListener('click', function() { self._classifySource('secondary'); });
        btnRow.appendChild(secondaryBtn);

        prompt.appendChild(btnRow);
        wrapper.appendChild(prompt);

        // Feedback area
        var feedback = document.createElement('div');
        feedback.id = 'source-feedback';
        wrapper.appendChild(feedback);
    },

    _classifySource(answer) {
        if (this._answered) return;
        this._answered = true;
        this._total++;

        var source = this._sources[this._currentIndex];
        var isCorrect = answer === source.type;

        if (isCorrect) this._score++;

        // Disable buttons
        var primaryBtn = document.getElementById('classify-primary');
        var secondaryBtn = document.getElementById('classify-secondary');

        if (answer === 'primary') {
            primaryBtn.classList.add(isCorrect ? 'correct' : 'wrong');
        } else {
            secondaryBtn.classList.add(isCorrect ? 'correct' : 'wrong');
        }

        // Highlight the correct answer if wrong
        if (!isCorrect) {
            if (source.type === 'primary') {
                primaryBtn.classList.add('correct');
            } else {
                secondaryBtn.classList.add('correct');
            }
        }

        // Show feedback
        var feedback = document.getElementById('source-feedback');
        if (!feedback) return;
        while (feedback.firstChild) feedback.removeChild(feedback.firstChild);

        var msg = document.createElement('div');
        msg.className = 'source-feedback-msg ' + (isCorrect ? 'correct' : 'wrong');

        var msgIcon = document.createElement('i');
        msgIcon.className = isCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
        msg.appendChild(msgIcon);

        var msgText = document.createElement('span');
        if (isCorrect) {
            msgText.textContent = ' Correct! This ' + source.format + ' is a ' + source.type + ' source.';
        } else {
            msgText.textContent = ' Not quite. This ' + source.format + ' is a ' + source.type + ' source.';
        }
        msg.appendChild(msgText);

        var explanation = document.createElement('p');
        explanation.style.marginTop = '8px';
        explanation.style.fontSize = '0.95em';
        if (source.type === 'primary') {
            explanation.textContent = 'This is a primary source because it was created in ' + source.year + ' by ' + source.creator + ', during the time period being studied.';
        } else {
            explanation.textContent = 'This is a secondary source because it was created in ' + source.year + ', long after the historical events it describes, by someone analyzing and interpreting those events.';
        }
        msg.appendChild(explanation);

        feedback.appendChild(msg);

        // Store result
        this._results.push({
            title: source.title,
            classifyCorrect: isCorrect,
            questionResults: []
        });

        // Show comprehension questions button
        var self = this;
        if (source.questions && source.questions.length > 0) {
            var qBtn = document.createElement('button');
            qBtn.className = 'nav-button';
            qBtn.style.marginTop = '15px';
            qBtn.style.background = 'var(--primary)';
            qBtn.style.color = 'white';
            var qIcon = document.createElement('i');
            qIcon.className = 'fas fa-question-circle';
            qBtn.appendChild(qIcon);
            qBtn.appendChild(document.createTextNode(' Answer Comprehension Questions'));
            qBtn.addEventListener('click', function() {
                self._showingQuestions = true;
                self._questionIndex = 0;
                self._questionScore = 0;
                self._showQuestion();
            });
            feedback.appendChild(qBtn);
        } else {
            this._showNextButton(feedback);
        }
    },

    _showQuestion() {
        var source = this._sources[this._currentIndex];
        if (this._questionIndex >= source.questions.length) {
            // Done with questions, show next button
            var feedback = document.getElementById('source-feedback');
            this._results[this._results.length - 1].questionResults = this._questionScore + '/' + source.questions.length;
            this._showNextButton(feedback);
            return;
        }

        var q = source.questions[this._questionIndex];

        var feedback = document.getElementById('source-feedback');
        if (!feedback) return;
        while (feedback.firstChild) feedback.removeChild(feedback.firstChild);

        var qCard = document.createElement('div');
        qCard.className = 'source-question-card';

        var qNum = document.createElement('div');
        qNum.className = 'source-question-num';
        qNum.textContent = 'Question ' + (this._questionIndex + 1) + ' of ' + source.questions.length;
        qCard.appendChild(qNum);

        var qText = document.createElement('p');
        qText.className = 'source-question-text';
        qText.textContent = q.question;
        qCard.appendChild(qText);

        var self = this;
        var optionsDiv = document.createElement('div');
        optionsDiv.className = 'source-question-options';

        q.options.forEach(function(opt, idx) {
            var optBtn = document.createElement('button');
            optBtn.className = 'source-question-option';
            optBtn.textContent = opt;
            optBtn.addEventListener('click', function() {
                self._answerQuestion(idx, q.correct, optionsDiv);
            });
            optionsDiv.appendChild(optBtn);
        });

        qCard.appendChild(optionsDiv);

        var qFeedback = document.createElement('div');
        qFeedback.id = 'question-feedback';
        qCard.appendChild(qFeedback);

        feedback.appendChild(qCard);
    },

    _answerQuestion(selected, correct, optionsDiv) {
        var buttons = optionsDiv.querySelectorAll('.source-question-option');
        // Check if already answered
        if (optionsDiv.classList.contains('answered')) return;
        optionsDiv.classList.add('answered');

        var isCorrect = selected === correct;
        if (isCorrect) {
            this._score++;
            this._total++;
            this._questionScore++;
        } else {
            this._total++;
        }

        buttons[selected].classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            buttons[correct].classList.add('correct');
        }

        var qFeedback = document.getElementById('question-feedback');
        if (qFeedback) {
            var msg = document.createElement('div');
            msg.className = 'source-feedback-msg small ' + (isCorrect ? 'correct' : 'wrong');
            msg.textContent = isCorrect ? 'Correct!' : 'Not quite — the correct answer is highlighted above.';
            qFeedback.appendChild(msg);
        }

        var self = this;
        this._questionIndex++;

        var nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.style.marginTop = '10px';

        if (this._questionIndex < this._sources[this._currentIndex].questions.length) {
            var nIcon = document.createElement('i');
            nIcon.className = 'fas fa-arrow-right';
            nextBtn.appendChild(nIcon);
            nextBtn.appendChild(document.createTextNode(' Next Question'));
            nextBtn.addEventListener('click', function() { self._showQuestion(); });
        } else {
            var nIcon2 = document.createElement('i');
            nIcon2.className = 'fas fa-arrow-right';
            nextBtn.appendChild(nIcon2);
            nextBtn.appendChild(document.createTextNode(
                this._currentIndex < this._sources.length - 1 ? ' Next Source' : ' See Results'
            ));
            nextBtn.addEventListener('click', function() {
                self._currentIndex++;
                self._showSource();
            });
        }

        if (qFeedback) qFeedback.appendChild(nextBtn);
    },

    _showNextButton(container) {
        var self = this;
        var nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.style.marginTop = '15px';
        nextBtn.style.background = 'var(--primary)';
        nextBtn.style.color = 'white';
        var nIcon = document.createElement('i');
        nIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(nIcon);
        nextBtn.appendChild(document.createTextNode(
            this._currentIndex < this._sources.length - 1 ? ' Next Source' : ' See Results'
        ));
        nextBtn.addEventListener('click', function() {
            self._currentIndex++;
            self._showSource();
        });
        container.appendChild(nextBtn);
    },

    _showFinalResults() {
        var wrapper = document.getElementById('source-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var pct = this._total > 0 ? Math.round((this._score / this._total) * 100) : 0;

        // Save progress
        this._stats.completed++;
        if (pct > this._stats.bestScore) this._stats.bestScore = pct;
        this._saveProgress();

        var results = document.createElement('div');
        results.className = 'source-results';

        var title = document.createElement('h2');
        title.textContent = 'Analysis Complete!';
        title.style.color = 'var(--primary)';
        results.appendChild(title);

        var scoreEl = document.createElement('div');
        scoreEl.className = 'source-final-score';
        scoreEl.textContent = pct + '%';
        results.appendChild(scoreEl);

        var detail = document.createElement('p');
        detail.style.color = '#666';
        detail.style.marginBottom = '20px';
        detail.textContent = this._score + ' correct out of ' + this._total + ' total questions';
        results.appendChild(detail);

        // Performance message
        var perfMsg = document.createElement('div');
        perfMsg.className = 'source-perf-msg';
        if (pct >= 90) {
            perfMsg.textContent = 'Excellent! You have a strong understanding of primary and secondary sources.';
            perfMsg.style.color = '#166534';
        } else if (pct >= 70) {
            perfMsg.textContent = 'Good work! Keep practicing to strengthen your source analysis skills.';
            perfMsg.style.color = 'var(--primary)';
        } else {
            perfMsg.textContent = 'Keep studying! Remember: primary sources are from the time period, secondary sources are created later by researchers.';
            perfMsg.style.color = '#b45309';
        }
        results.appendChild(perfMsg);

        // Results breakdown
        var breakdown = document.createElement('div');
        breakdown.className = 'source-breakdown';

        var breakTitle = document.createElement('h3');
        breakTitle.textContent = 'Source Breakdown';
        breakTitle.style.marginBottom = '10px';
        breakdown.appendChild(breakTitle);

        var self = this;
        this._results.forEach(function(r) {
            var row = document.createElement('div');
            row.className = 'source-breakdown-row';

            var icon = document.createElement('i');
            icon.className = r.classifyCorrect ? 'fas fa-check-circle' : 'fas fa-times-circle';
            icon.style.color = r.classifyCorrect ? '#22c55e' : '#ef4444';
            row.appendChild(icon);

            var nameSpan = document.createElement('span');
            nameSpan.textContent = ' ' + r.title;
            row.appendChild(nameSpan);

            if (r.questionResults) {
                var qSpan = document.createElement('span');
                qSpan.className = 'source-breakdown-questions';
                qSpan.textContent = 'Questions: ' + r.questionResults;
                row.appendChild(qSpan);
            }

            breakdown.appendChild(row);
        });

        results.appendChild(breakdown);

        // Try again button
        var againBtn = document.createElement('button');
        againBtn.className = 'nav-button';
        againBtn.style.marginTop = '20px';
        againBtn.style.background = 'var(--primary)';
        againBtn.style.color = 'white';
        againBtn.style.fontSize = '1.1em';
        againBtn.style.padding = '10px 25px';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-redo';
        againBtn.appendChild(btnIcon);
        againBtn.appendChild(document.createTextNode(' Try Again'));
        againBtn.addEventListener('click', function() {
            self._currentIndex = 0;
            self._score = 0;
            self._total = 0;
            self._results = [];
            // Re-shuffle
            for (var i = self._sources.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = self._sources[i];
                self._sources[i] = self._sources[j];
                self._sources[j] = tmp;
            }
            self._showSource();
        });
        results.appendChild(againBtn);

        wrapper.appendChild(results);
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'source-analysis', {
            completed: this._stats.completed,
            bestScore: this._stats.bestScore
        });
    },

    activate() {},
    deactivate() {},

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'source-analysis');
    },

    loadProgress(data) {
        if (data) {
            this._stats = { completed: data.completed || 0, bestScore: data.bestScore || 0 };
        }
    }
});
