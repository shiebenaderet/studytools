// Colonial Geography challenge map data.
// Reuses CIVIL_WAR_MAP_BASE for state outlines, lakes, and rivers.
// Adds colonial-era cities, the Proclamation Line, and geographic features.
// viewBox matches the civil war map: 0 0 900 725
(function() {
    'use strict';

    var COLONIES = [
        'Massachusetts', 'New Hampshire', 'Connecticut', 'Rhode Island',
        'New York', 'New Jersey', 'Pennsylvania', 'Delaware',
        'Maryland', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia'
    ];

    var COLONY_REGIONS = {
        'Massachusetts': 'new-england', 'New Hampshire': 'new-england',
        'Connecticut': 'new-england', 'Rhode Island': 'new-england',
        'New York': 'middle', 'New Jersey': 'middle',
        'Pennsylvania': 'middle', 'Delaware': 'middle',
        'Maryland': 'southern', 'Virginia': 'southern',
        'North Carolina': 'southern', 'South Carolina': 'southern',
        'Georgia': 'southern'
    };

    var CONTEXT_STATES = [
        'Maine', 'Vermont', 'Ohio', 'Kentucky', 'Tennessee',
        'West Virginia', 'Indiana', 'Michigan', 'Wisconsin', 'Illinois',
        'Minnesota', 'Iowa', 'Missouri', 'Arkansas', 'Louisiana',
        'Mississippi', 'Alabama', 'Florida'
    ];

    window.COLONIAL_GEO_COLONIES = COLONIES;
    window.COLONIAL_GEO_REGIONS = COLONY_REGIONS;
    window.COLONIAL_GEO_CONTEXT = CONTEXT_STATES;

    window.COLONIAL_GEO_CITIES = [
        // Major colonial cities from the curriculum
        { id: 'boston', name: 'Boston', region: 'new-england', x: 780, y: 218,
          description: 'Capital of Massachusetts. Site of the Boston Massacre (1770) and Boston Tea Party (1773).' },
        { id: 'philadelphia', name: 'Philadelphia', region: 'middle', x: 645, y: 296,
          description: 'Largest colonial city. Meeting place of the Continental Congress and where the Declaration of Independence was signed (1776).' },
        { id: 'new-york-city', name: 'New York City', region: 'middle', x: 710, y: 262,
          description: 'Major port city. Began as the Dutch colony of New Amsterdam before Britain took it in 1664.' },
        { id: 'charleston', name: 'Charleston', region: 'southern', x: 498, y: 548,
          description: 'Founded 1670. One of the largest cities in colonial America. Center of the rice and indigo trade, built on enslaved labor.' },
        { id: 'jamestown', name: 'Jamestown', region: 'southern', x: 590, y: 392,
          description: 'Founded 1607. First permanent English settlement in North America. Tobacco made it profitable.' },
        { id: 'williamsburg', name: 'Williamsburg', region: 'southern', x: 602, y: 385,
          description: 'Capital of Virginia from 1699. Center of colonial government where Patrick Henry spoke against British taxes.' },
        { id: 'savannah', name: 'Savannah', region: 'southern', x: 470, y: 582,
          description: 'Founded 1733 by James Oglethorpe. First city in Georgia, the last of the thirteen colonies.' },
        { id: 'baltimore', name: 'Baltimore', region: 'southern', x: 610, y: 335,
          description: 'Major port in Maryland. Named after Lord Baltimore, the colony\'s founder.' },
        { id: 'hartford', name: 'Hartford', region: 'new-england', x: 730, y: 237,
          description: 'Founded 1636. Capital of Connecticut. Thomas Hooker led Puritans here from Massachusetts.' },
        { id: 'providence', name: 'Providence', region: 'new-england', x: 762, y: 237,
          description: 'Founded 1636 by Roger Williams after Massachusetts banished him for his religious beliefs.' },
        { id: 'albany', name: 'Albany', region: 'middle', x: 702, y: 186,
          description: 'Trading post on the Hudson River. Site of the Albany Congress (1754) where Benjamin Franklin proposed colonial unity.' },
        { id: 'plymouth', name: 'Plymouth', region: 'new-england', x: 775, y: 230,
          description: 'Founded 1620 by the Pilgrims. Site of the Mayflower landing and the first Thanksgiving.' },

        // Frontier and French & Indian War locations
        { id: 'fort-duquesne', name: 'Fort Duquesne', region: 'frontier', x: 470, y: 306,
          description: 'French fort where the Ohio and Allegheny rivers meet (modern Pittsburgh). Trigger point of the French & Indian War.' },
        { id: 'quebec', name: 'Québec', region: 'french', x: 790, y: 35,
          description: 'Capital of New France. The British captured it in 1759, a turning point in the French & Indian War.' },
        { id: 'montreal', name: 'Montréal', region: 'french', x: 700, y: 70,
          description: 'Major French trading center. Fell to the British in 1760, ending French control of Canada.' },
        { id: 'new-orleans', name: 'New Orleans', region: 'french', x: 175, y: 660,
          description: 'Founded by France in 1718. Controlled the mouth of the Mississippi River, vital for trade.' },
        { id: 'st-augustine', name: 'St. Augustine', region: 'spanish', x: 472, y: 630,
          description: 'Founded 1565 by Spain. Oldest European settlement in what is now the United States.' },
        { id: 'detroit', name: 'Detroit', region: 'french', x: 420, y: 210,
          description: 'French fur trading post. Near here, Pontiac led Native attacks on British forts in 1763.' }
    ];

    // Proclamation Line of 1763 — approximate path along Appalachian ridge
    // in civil war map coordinates (0 0 900 725)
    window.COLONIAL_GEO_PROCLAMATION_LINE = "M 680,110 L 665,130 L 650,155 L 638,175 L 620,200 L 600,225 L 580,255 L 565,275 L 548,295 L 530,320 L 518,345 L 505,370 L 495,390 L 480,415 L 465,440 L 450,465 L 435,490 L 420,515 L 410,535";

    // Geographic features for labeling
    window.COLONIAL_GEO_FEATURES = [
        { id: 'appalachian-mtns', name: 'Appalachian Mountains', type: 'mountain',
          x: 490, y: 370, angle: -60,
          description: 'Mountain range running from Georgia to Maine. The Proclamation of 1763 banned settlement west of these mountains.' },
        { id: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'water',
          x: 780, y: 450, angle: -75,
          description: 'The ocean separating the colonies from Britain. It took 6-8 weeks to cross by ship.' },
        { id: 'ohio-valley', name: 'Ohio River Valley', type: 'region',
          x: 390, y: 340, angle: 0,
          description: 'The territory both France and Britain claimed. Conflict here sparked the French & Indian War in 1754.' },
        { id: 'hudson-river', name: 'Hudson River', type: 'river',
          x: 700, y: 220, angle: -15,
          description: 'River running through New York. The Dutch settled along it; the British used it as a key north-south route.' }
    ];

})();
