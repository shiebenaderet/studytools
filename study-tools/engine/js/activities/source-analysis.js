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
                topic: "The First Presidencies",
                image: "iiif-public_gdcmassbookdig_washingtonsfarew02wash_washingtonsfarew02wash_0020-full-pct_50.0-0-default.jpg",
                excerpt: "\"I have already intimated to you the danger of parties in the State... Let me now take a more comprehensive view, and warn you in the most solemn manner against the baneful effects of the spirit of party generally.\"",
                context: "Published in newspapers across the country as Washington prepared to leave office after two terms.",
                questions: [
                    {
                        question: "What is Washington warning Americans about in this excerpt?",
                        options: ["The dangers of political parties dividing the nation", "The need for building a much stronger military force", "The importance of forming alliances with foreign nations", "The growing threat of another British invasion attempt"],
                        correct: 0
                    },
                    {
                        question: "Why is this considered a primary source?",
                        options: ["It was written by a historian who studied the topic much later", "It was created by someone who actually lived during the event", "It contains facts about history that anyone could easily find", "It is very old and is stored in an official government archive"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Letter to Elbridge Gerry",
                creator: "Thomas Jefferson",
                year: 1797,
                type: "primary",
                format: "letter",
                topic: "Political Parties Are Born",
                image: "jefferson_to_gerry(alternative letter).jpg",
                excerpt: "\"The second office of this government is honorable and easy, the first is but a splendid misery.\"",
                context: "Jefferson wrote this private letter to Elbridge Gerry, a fellow Democratic-Republican, reflecting on the presidency after the 1796 election.",
                questions: [
                    {
                        question: "What does Jefferson mean by calling the presidency 'a splendid misery'?",
                        options: ["The president gets paid far too little for the work", "The job is prestigious but comes with heavy burdens", "The White House is uncomfortable and poorly maintained", "Presidents are not respected by the general public"],
                        correct: 1
                    },
                    {
                        question: "What makes a personal letter a valuable primary source?",
                        options: ["Letters are always completely accurate accounts of events", "They reveal private thoughts of people from that time period", "Letters are written by trained and professional writers only", "They are printed and widely available to the general public"],
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
                topic: "Political Parties Are Born",
                image: "alien_sedition.jpg",
                excerpt: "\"If any person shall write, print, utter, or publish... any false, scandalous and malicious writing or writings against the government of the United States... shall be punished by a fine not exceeding two thousand dollars, and by imprisonment not exceeding two years.\"",
                context: "Passed by Congress under President John Adams during tensions with France, the Sedition Act made it a crime to criticize the government — directly challenging the First Amendment's protections of free speech and press. The Alien Acts also gave the president power to deport immigrants deemed 'dangerous.'",
                questions: [
                    {
                        question: "Which right protected by the First Amendment did the Sedition Act threaten?",
                        options: ["Freedom of religion and worship", "The right to bear arms and weapons", "Freedom of speech and the press", "The right to a fair and speedy trial"],
                        correct: 2
                    },
                    {
                        question: "Why would a historian want to read the actual text of this law rather than just a summary?",
                        options: ["Summaries are always wrong about the most important details", "The original text shows exactly what was banned and punished", "Old documents are much more interesting to read and study", "Historians are only allowed to use primary sources for research"],
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
                topic: "The First Presidencies",
                image: "hamilton_report.jpg",
                excerpt: "\"The debt of the United States... was the price of liberty. The faith of America has been repeatedly pledged for it... Among ourselves, the most enlightened friends of good government are those whose expectations are the highest.\"",
                context: "Hamilton presented this report to Congress proposing that the federal government assume all state debts from the Revolutionary War. His plan was strongly opposed by Thomas Jefferson and James Madison, who feared it gave too much power to the federal government and benefited wealthy northern bankers.",
                questions: [
                    {
                        question: "How does Hamilton justify taking on the national debt?",
                        options: ["He says that debt does not matter for a new nation at all", "He calls it 'the price of liberty' that is worth paying", "He blames the states for spending far too much of their money", "He says Britain should be forced to pay all of America's debts"],
                        correct: 1
                    },
                    {
                        question: "Who opposed Hamilton's financial plan?",
                        options: ["George Washington and John Jay opposed it strongly", "John Adams and Abigail Adams argued against the plan", "Thomas Jefferson and James Madison led the opposition", "Benjamin Franklin and Samuel Adams rejected his ideas"],
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
                topic: "Political Parties Are Born",
                image: "kentucky.jpeg",
                excerpt: "\"Resolved, that the several States composing the United States of America, are not united on the principle of unlimited submission to their General Government... whensoever the General Government assumes undelegated powers, its acts are unauthoritative, void, and of no force.\"",
                context: "As Vice President, Jefferson secretly wrote this resolution for the Kentucky legislature to protest the Alien and Sedition Acts, arguing states could nullify federal laws they believed were unconstitutional.",
                questions: [
                    {
                        question: "What principle is Jefferson arguing for in this resolution?",
                        options: ["The federal government has unlimited power over the states", "States have the right to reject unconstitutional federal laws", "All laws passed by Congress must be obeyed without question", "Only the president can decide which laws are constitutional"],
                        correct: 1
                    },
                    {
                        question: "Why did Jefferson write this anonymously?",
                        options: ["He was not a skilled enough writer to claim credit", "As Vice President, openly opposing federal law would be controversial", "He did not actually care very much about the issue", "It was required by law that all resolutions be anonymous"],
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
                topic: "Political Parties Are Born",
                image: "chapter_parties.png",
                excerpt: "\"The rivalry between Hamilton and Jefferson laid the foundation for America's first political parties. Hamilton's Federalists favored a strong central government and close ties with Britain, while Jefferson's Democratic-Republicans championed states' rights and sympathized with France.\"",
                context: "Written by historians for students, summarizing and interpreting events that happened over 200 years ago.",
                questions: [
                    {
                        question: "Why is a modern textbook considered a secondary source?",
                        options: ["It is printed on paper and sold widely in bookstores", "It was written long after the events by someone who wasn't there", "It contains incorrect information about some major historical events", "It is used in schools and regularly assigned by teachers"],
                        correct: 1
                    },
                    {
                        question: "What is one advantage of using a secondary source like a textbook?",
                        options: ["It gives you the exact words spoken by historical figures", "It organizes and explains events using evidence from many primary sources", "It is always completely unbiased and perfectly neutral", "It replaces the need for primary sources in research"],
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
                topic: "Exploring & Growing",
                image: "the_duel.jpg",
                excerpt: "\"The bitter rivalry between Alexander Hamilton and Aaron Burr culminated in one of the most famous duels in American history. On July 11, 1804, the two men met on the dueling grounds at Weehawken, New Jersey...\"",
                context: "A modern documentary using dramatic reenactments, expert interviews, and historical evidence to tell the story.",
                questions: [
                    {
                        question: "What makes this documentary a secondary source rather than a primary source?",
                        options: ["It uses video recordings instead of traditional written text", "It was created long after the events by people who researched them", "It mentions real historical figures and actual places from history", "It is entertaining and specifically designed for a very wide audience"],
                        correct: 1
                    },
                    {
                        question: "How might a documentary be useful even though it's a secondary source?",
                        options: ["Documentaries are always completely accurate and trustworthy", "They can make complex historical events easier to understand", "They replace the need to study from books or textbooks", "They are considered more important than primary sources"],
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
                topic: "Political Parties Are Born",
                image: "Lyon-griswold-brawl.jpg",
                excerpt: "[A political cartoon showing Congressman Matthew Lyon and Roger Griswold fighting on the floor of Congress with a fire tongs and cane while other members watch]",
                context: "This cartoon depicted an actual fight that broke out in Congress in 1798 between a Federalist and a Democratic-Republican, showing how divided the nation's leaders had become.",
                questions: [
                    {
                        question: "What does this cartoon reveal about politics in the Early Republic?",
                        options: ["Congress was always peaceful and orderly during official debates", "Political disagreements were so intense they sometimes turned violent", "Everyone agreed on the major issues that the new nation faced", "Congressmen often settled their arguments with friendly competitions"],
                        correct: 1
                    },
                    {
                        question: "Even though we don't know the artist, why is this still a primary source?",
                        options: ["Because it is a drawing rather than a written document of events", "Because it was created during the time period that it depicts", "Because it is funny and was meant to entertain its readers", "Because it is preserved in a museum or a government archive"],
                        correct: 1
                    }
                ]
            },
            {
                title: "Abigail Adams's Letter to Her Sister",
                creator: "Abigail Adams",
                year: 1800,
                type: "primary",
                format: "letter",
                topic: "The First Presidencies",
                image: "adams_ladies_2.jpg__2000x1125_q85_crop_subsampling-2_upscale.jpg",
                excerpt: "\"I arrived in this city on Sunday... The house is made habitable, but there is not a single apartment finished... I had much rather live in the house at Philadelphia. Not one room or chamber is finished of the whole. It is habitable by fires in every part, thirteen of which we are obliged to keep daily, or sleep in wet and damp places.\"",
                context: "Abigail Adams wrote to her sister about moving into the unfinished White House in November 1800, giving a firsthand account of early life in the new capital.",
                questions: [
                    {
                        question: "What does this letter reveal about the new capital?",
                        options: ["The White House was a luxurious and comfortable building from the start", "The new capital and White House were still unfinished and uncomfortable", "Abigail Adams loved Washington, D.C. more than Philadelphia", "The government had plenty of money to furnish the president's home"],
                        correct: 1
                    },
                    {
                        question: "Why are personal letters especially valuable to historians?",
                        options: ["They are written in fancy handwriting that looks very impressive", "They show private thoughts and everyday details not found in official records", "They are always truthful and are completely free of any bias", "They are short and much easier to read compared to other sources"],
                        correct: 1
                    }
                ]
            },
            {
                title: "The Whiskey Rebellion by William Hogeland",
                creator: "William Hogeland",
                year: 2006,
                type: "secondary",
                format: "book",
                topic: "The First Presidencies",
                image: "whiskey_hogeland.jpg",
                excerpt: "\"The farmers of western Pennsylvania had legitimate grievances against Hamilton's excise tax, which disproportionately burdened small producers. Washington's decision to march 13,000 troops demonstrated that the new federal government would enforce its laws — a critical precedent for national authority.\"",
                context: "Hogeland's book examines the Whiskey Rebellion in depth, using primary sources and government records to tell the story of the farmers' revolt and the federal response.",
                questions: [
                    {
                        question: "What makes this book a secondary source?",
                        options: ["It is written by a professional author with scholarly credentials", "It analyzes and interprets events using evidence gathered long after", "It is published by a major company and written for general readers", "It mentions the Whiskey Rebellion and many other real historical events"],
                        correct: 1
                    },
                    {
                        question: "The historian presents multiple perspectives. Why is this important?",
                        options: ["It makes the article longer and more detailed for all readers", "It helps readers understand the complexity of historical events", "Historians are required to do this by their professional rules", "It proves that one side was completely right about everything"],
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
                topic: "Exploring & Growing",
                image: "greenville.jpg",
                excerpt: "\"The Indian tribes who have a right to those lands, are quietly to enjoy them, hunting, planting, and dwelling thereon so long as they please, without any molestation from the United States.\"",
                context: "This treaty was signed after the Battle of Fallen Timbers, forcing Native American nations to give up most of present-day Ohio to the United States.",
                questions: [
                    {
                        question: "What contradiction do you notice between the treaty's language and its actual effect?",
                        options: ["There is no contradiction between the words and the outcome", "The treaty promises peace while actually taking Native American land", "The treaty gave large amounts of land back to Native Americans", "The treaty was never actually signed by either side involved"],
                        correct: 1
                    },
                    {
                        question: "Why is it important to read the actual words of a treaty rather than just a summary?",
                        options: ["Treaties use complicated language that is very interesting to study", "You can see how language may have been used to disguise unfair terms", "Summaries are always biased and they leave out many important details", "Treaties are always written to be perfectly fair to both sides"],
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
                topic: "Exploring & Growing",
                image: "The_Star-Spangled_Banner.JPG",
                excerpt: "\"O say can you see, by the dawn's early light, / What so proudly we hail'd at the twilight's last gleaming, / Whose broad stripes and bright stars through the perilous fight / O'er the ramparts we watch'd were so gallantly streaming?\"",
                context: "Francis Scott Key wrote this poem after witnessing the British bombardment of Fort McHenry during the War of 1812. It later became the national anthem.",
                questions: [
                    {
                        question: "What event inspired Francis Scott Key to write this poem?",
                        options: ["The signing of the Constitution in Philadelphia", "The British bombardment of Fort McHenry in Baltimore", "Washington's inauguration as the first president", "The Boston Tea Party protest against British taxes"],
                        correct: 1
                    },
                    {
                        question: "A poem can be a primary source because:",
                        options: ["All poems are automatically considered to be primary sources", "It was created by someone who witnessed the event firsthand", "Poems are always historically accurate accounts of real events", "It rhymes and uses creative language when describing history"],
                        correct: 1
                    }
                ]
            }
        ];
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        var allSources = this._getSourceData();
        // Filter sources by unlocked categories
        var unlocked = MasteryManager.getUnlockedCategories(config.unit.id, config);
        this._sources = allSources.filter(function(s) {
            return !s.topic || unlocked.includes(s.topic);
        });
        this._currentIndex = 0;
        this._score = 0;
        this._total = 0;
        this._results = [];

        // Load saved stats
        var saved = ProgressManager.getActivityProgress(config.unit.id, 'source-analysis');
        if (saved) {
            this._stats = { completed: saved.completed || 0, bestScore: saved.bestScore || 0 };
        } else {
            this._stats = { completed: 0, bestScore: 0 };
        }

        // Check for in-progress session
        var session = this._loadSession();

        if (session && session.currentIndex > 0 && session.currentIndex < this._sources.length) {
            // Restore source order and progress (filtered to unlocked)
            var restoreSources = this._getSourceData();
            var unlockedCats = MasteryManager.getUnlockedCategories(config.unit.id, config);
            this._sources = session.sourceOrder.map(function(title) {
                return restoreSources.find(function(s) { return s.title === title; });
            }).filter(function(s) {
                return s && (!s.topic || unlockedCats.includes(s.topic));
            });
            this._currentIndex = session.currentIndex;
            this._score = session.score;
            this._total = session.total;
            this._results = session.results || [];
        } else {
            // Shuffle sources for new session
            for (var i = this._sources.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = this._sources[i];
                this._sources[i] = this._sources[j];
                this._sources[j] = tmp;
            }
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'source-analysis-container';
        wrapper.id = 'source-wrapper';
        container.appendChild(wrapper);

        if (session && session.currentIndex > 0 && session.currentIndex < this._sources.length) {
            this._showIntroResume();
        } else {
            this._showIntro();
        }
    },

    _saveSession() {
        var sessionData = {
            sourceOrder: this._sources.map(function(s) { return s.title; }),
            currentIndex: this._currentIndex,
            score: this._score,
            total: this._total,
            results: this._results
        };
        try {
            localStorage.setItem('source-session-' + this._config.unit.id, JSON.stringify(sessionData));
        } catch(e) {}
    },

    _loadSession() {
        try {
            var data = localStorage.getItem('source-session-' + this._config.unit.id);
            return data ? JSON.parse(data) : null;
        } catch(e) { return null; }
    },

    _clearSession() {
        try {
            localStorage.removeItem('source-session-' + this._config.unit.id);
        } catch(e) {}
    },

    _showIntroResume() {
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

        var resumeMsg = document.createElement('p');
        resumeMsg.style.color = 'var(--text-secondary)';
        resumeMsg.style.marginBottom = '20px';
        resumeMsg.style.lineHeight = '1.6';
        resumeMsg.textContent = 'You have an in-progress session (' + this._currentIndex + ' of ' + this._sources.length + ' sources completed). Would you like to continue or start over?';
        intro.appendChild(resumeMsg);

        var self = this;

        var resumeBtn = document.createElement('button');
        resumeBtn.className = 'nav-button';
        resumeBtn.style.marginTop = '10px';
        resumeBtn.style.background = 'var(--primary)';
        resumeBtn.style.color = 'white';
        resumeBtn.style.fontSize = '1.1em';
        resumeBtn.style.padding = '12px 30px';
        resumeBtn.style.marginRight = '10px';
        var rIcon = document.createElement('i');
        rIcon.className = 'fas fa-play';
        resumeBtn.appendChild(rIcon);
        resumeBtn.appendChild(document.createTextNode(' Continue'));
        resumeBtn.addEventListener('click', function() { self._showSource(); });
        intro.appendChild(resumeBtn);

        var restartBtn = document.createElement('button');
        restartBtn.className = 'nav-button';
        restartBtn.style.marginTop = '10px';
        restartBtn.style.background = '#94a3b8';
        restartBtn.style.color = 'white';
        restartBtn.style.fontSize = '1.1em';
        restartBtn.style.padding = '12px 30px';
        var sIcon = document.createElement('i');
        sIcon.className = 'fas fa-redo';
        restartBtn.appendChild(sIcon);
        restartBtn.appendChild(document.createTextNode(' Start Over'));
        restartBtn.addEventListener('click', function() {
            self._clearSession();
            self._currentIndex = 0;
            self._score = 0;
            self._total = 0;
            self._results = [];
            for (var i = self._sources.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = self._sources[i];
                self._sources[i] = self._sources[j];
                self._sources[j] = tmp;
            }
            self._showSource();
        });
        intro.appendChild(restartBtn);

        wrapper.appendChild(intro);
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
        desc.style.color = 'var(--text-secondary)';
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
            statsEl.style.color = 'var(--text-muted)';
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

        // Shuffle options while tracking correct answer
        var indices = q.options.map(function(_, i) { return i; });
        for (var si = indices.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            var stmp = indices[si];
            indices[si] = indices[sj];
            indices[sj] = stmp;
        }
        var shuffledCorrect = indices.indexOf(q.correct);

        indices.forEach(function(origIdx, displayIdx) {
            var optBtn = document.createElement('button');
            optBtn.className = 'source-question-option';
            optBtn.textContent = q.options[origIdx];
            optBtn.addEventListener('click', function() {
                self._answerQuestion(displayIdx, shuffledCorrect, optionsDiv);
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
                self._saveSession();
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
            self._saveSession();
            self._showSource();
        });
        container.appendChild(nextBtn);
    },

    _showFinalResults() {
        this._clearSession();

        var wrapper = document.getElementById('source-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var pct = this._total > 0 ? Math.round((this._score / this._total) * 100) : 0;

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'source-analysis', score: pct, event: 'complete' });
        }

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
        detail.style.color = '#4b5563';
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

            if (r.questionResults && typeof r.questionResults === 'string') {
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
