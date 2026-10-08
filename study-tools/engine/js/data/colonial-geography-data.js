// Colonial Geography challenge map data.
// Reuses CIVIL_WAR_MAP_BASE for state outlines, lakes, and rivers.
// Adds colonial-era cities and forts, the Proclamation Line, and labeled features.
//
// Coordinates are in the civil-war base's Mercator space (viewBox 0 0 900 725):
//   x = 30.0 * (lon + 102.05) - 149.3
//   y = 423.7 - 1705 * (ln(tan(45° + lat/2)) - 0.69599)
// fitted from the Kansas and Maine state extents; verified against Boston, the
// Massachusetts northern border, and the base map's own Ohio River headwater
// (Pittsburgh) to within ~2px.
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

    window.COLONIAL_GEO_COLONIES = COLONIES;
    window.COLONIAL_GEO_REGIONS = COLONY_REGIONS;

    // Colony abbreviations default to the shape's bounding-box center. Override
    // where that collides with a city cluster or the Proclamation Line; null
    // drops the label (CT and RI are too small to label next to their cities).
    window.COLONIAL_GEO_COLONY_LABELS = {
        'Pennsylvania': [600, 300],
        'Massachusetts': [745, 210],
        'Connecticut': null,
        'Rhode Island': null
    };

    // The Midwest west of the Mississippi adds nothing here; crop it out so the
    // colonies get the screen space. New Orleans (x=210) stays in frame.
    window.COLONIAL_GEO_VIEWBOX = '150 0 750 725';

    // Optional per-place fields:
    //   marker: 'fort'    drawn as a star instead of a dot
    //   quiz: false       shown in Explore but never asked (used when two places
    //                     are too close to tell apart by clicking)
    //   quiz: 'full'      asked only in the Full Challenge, not the City Quiz
    //   labelDx, labelDy  nudge the name label away from a neighbor
    window.COLONIAL_GEO_CITIES = [
        // Colonial cities
        { id: 'boston', name: 'Boston', region: 'new-england', x: 780, y: 215,
          description: 'Founded 1630. Capital of Massachusetts. Site of the Boston Massacre (1770) and Boston Tea Party (1773).' },
        { id: 'plymouth', name: 'Plymouth', region: 'new-england', x: 792, y: 232,
          description: 'Founded 1620 by the Pilgrims. Site of the Mayflower landing and the first Thanksgiving.' },
        { id: 'providence', name: 'Providence', region: 'new-england', x: 770, y: 238, labelDy: 12,
          description: 'Founded 1636 by Roger Williams after Massachusetts banished him for his religious beliefs.' },
        { id: 'hartford', name: 'Hartford', region: 'new-england', x: 732, y: 241, labelDx: -20, labelDy: 12,
          description: 'Founded 1636. Capital of Connecticut. Thomas Hooker led Puritans here from Massachusetts.' },
        { id: 'albany', name: 'Albany', region: 'middle', x: 699, y: 203,
          description: 'Dutch trading post on the Hudson River. Site of the Albany Congress (1754), where Benjamin Franklin proposed colonial unity.' },
        { id: 'new-york-city', name: 'New York City', region: 'middle', x: 692, y: 282,
          description: 'Major port at the mouth of the Hudson. Began as the Dutch colony of New Amsterdam (1624) before Britain took it in 1664.' },
        { id: 'philadelphia', name: 'Philadelphia', region: 'middle', x: 657, y: 311,
          description: 'Founded 1682 by William Penn. Largest colonial city. Meeting place of the Continental Congress and where the Declaration of Independence was signed (1776).' },
        { id: 'baltimore', name: 'Baltimore', region: 'southern', x: 614, y: 336,
          description: 'Founded 1729. Major port in Maryland. Named after Lord Baltimore, the colony\'s founder.' },
        { id: 'jamestown', name: 'Jamestown', region: 'southern', x: 609, y: 414, labelDx: -4, labelDy: 12,
          description: 'Founded 1607. First permanent English settlement in North America. Tobacco made it profitable.' },
        { id: 'williamsburg', name: 'Williamsburg', region: 'southern', x: 611, y: 412, quiz: false, labelDy: -5,
          description: 'Capital of Virginia from 1699, a few miles from Jamestown. Center of colonial government where Patrick Henry spoke against British taxes.' },
        { id: 'charleston', name: 'Charleston', region: 'southern', x: 514, y: 577,
          description: 'Founded 1670. One of the largest cities in colonial America. Center of the rice and indigo trade, built on enslaved labor.' },
        { id: 'savannah', name: 'Savannah', region: 'southern', x: 480, y: 600,
          description: 'Founded 1733 by James Oglethorpe. First city in Georgia, the last of the thirteen colonies.' },
        { id: 'quebec', name: 'Québec', region: 'french', x: 776, y: 31,
          description: 'Founded 1608. Capital of New France. The British captured it in 1759, the turning point of the French & Indian War.' },
        { id: 'montreal', name: 'Montréal', region: 'french', x: 705, y: 87,
          description: 'Founded 1642. Major French fur-trading center. Fell to the British in 1760, ending French control of Canada.' },
        { id: 'new-orleans', name: 'New Orleans', region: 'french', x: 210, y: 675,
          description: 'Founded by France in 1718. Controlled the mouth of the Mississippi River, vital for trade.' },
        { id: 'st-augustine', name: 'St. Augustine', region: 'spanish', x: 473, y: 678,
          description: 'Founded 1565 by Spain. Oldest European settlement in what is now the United States.' },

        // Forts of the French & Indian War and Pontiac's War (Full Challenge only)
        { id: 'fort-duquesne', name: 'Fort Duquesne', region: 'french', marker: 'fort', quiz: 'full', x: 512, y: 294,
          description: 'French fort where the Allegheny and Monongahela rivers form the Ohio (modern Pittsburgh). Trigger point of the French & Indian War. Renamed Fort Pitt after the British took it in 1758.' },
        { id: 'fort-necessity', name: 'Fort Necessity', region: 'frontier', marker: 'fort', quiz: 'full', x: 524, y: 316, labelDy: 9,
          description: 'Where 22-year-old George Washington surrendered to the French in July 1754, in the opening battle of the French & Indian War.' },
        { id: 'fort-niagara', name: 'Fort Niagara', region: 'french', marker: 'fort', quiz: 'full', x: 538, y: 186,
          description: 'French fort at the mouth of the Niagara River. The British captured it in 1759, cutting France off from the Ohio Country.' },
        { id: 'fort-frontenac', name: 'Fort Frontenac', region: 'french', marker: 'fort', quiz: 'full', x: 618, y: 139, labelDy: 12,
          description: 'French fort where Lake Ontario drains into the St. Lawrence. Taken by the British in 1758.' },
        { id: 'fort-detroit', name: 'Fort Detroit', region: 'french', marker: 'fort', quiz: 'full', x: 421, y: 217,
          description: 'French fort on the strait between Lakes Erie and Huron. Pontiac besieged its British garrison for months in 1763.' },
        { id: 'fort-michilimackinac', name: 'Fort Michilimackinac', region: 'french', marker: 'fort', quiz: 'full', x: 370, y: 76, labelDx: -4, labelDy: -8,
          description: 'Fur-trade fort at the straits between Lakes Michigan and Huron. Ojibwe warriors captured it during Pontiac\'s War in 1763.' }
    ];

    // Rivers the civil-war base lacks. Same format as its rivers array.
    window.COLONIAL_GEO_EXTRA_RIVERS = [
        { name: 'Hudson', points: '701,179 699,203 694,231 693,258 692,282' },
        { name: 'St. Lawrence', points: '618,139 660,118 705,87 736,50 776,31 803,13' }
    ];

    // Proclamation Line of 1763, traced along the Appalachian crest from the
    // Quebec border to central Georgia.
    var PROCLAMATION_POINTS = [
        [710, 108], [677, 170], [632, 231], [557, 290], [530, 334],
        [503, 394], [467, 438], [437, 478], [407, 505], [392, 533], [383, 558]
    ];
    window.COLONIAL_GEO_PROCLAMATION_LINE = 'M ' + PROCLAMATION_POINTS.map(function(p) { return p.join(','); }).join(' L ');

    // Labeled features; all are asked in the Full Challenge.
    //   hitPath   polyline a click may land near (default: the label point)
    //   hitRiver  name of a river whose drawn points become the hitPath
    //   hitRadius how close a click must be, in viewBox units (default 40)
    window.COLONIAL_GEO_FEATURES = [
        { id: 'appalachian-mtns', name: 'Appalachian Mountains', type: 'mountain',
          x: 468, y: 468, angle: -53, hitPath: PROCLAMATION_POINTS, hitRadius: 45,
          description: 'Mountain range running from Georgia to Maine. The Proclamation of 1763 banned settlement west of these mountains.' },
        { id: 'ohio-valley', name: 'Ohio River Valley', type: 'region',
          x: 390, y: 340, angle: 0, hitRadius: 70,
          description: 'The territory both France and Britain claimed. Conflict here sparked the French & Indian War in 1754.' },
        { id: 'ohio-river', name: 'Ohio River', type: 'river',
          x: 304, y: 391, angle: -28, hitRiver: 'Ohio', hitRadius: 30,
          description: 'Flows from Fort Duquesne (Pittsburgh) southwest to the Mississippi. The gateway to the Ohio Country that France and Britain fought over.' },
        { id: 'mississippi-river', name: 'Mississippi River', type: 'river',
          x: 196, y: 540, angle: -78, hitRiver: 'Mississippi', hitRadius: 30,
          description: 'The great river of the continent. In 1763 it became the western boundary of British territory; everything west went to Spain.' },
        { id: 'st-lawrence-river', name: 'St. Lawrence River', type: 'river',
          x: 670, y: 90, angle: -35, hitRiver: 'St. Lawrence', hitRadius: 30,
          description: 'The highway of New France, linking the Atlantic to the Great Lakes. Québec and Montréal sit on its banks.' },
        { id: 'hudson-river', name: 'Hudson River', type: 'river',
          x: 676, y: 238, angle: -80, hitRiver: 'Hudson', hitRadius: 30,
          description: 'River running through New York from Albany to New York City. The Dutch settled along it; the British used it as a key north-south route.' },
        { id: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'water',
          x: 780, y: 450, angle: -75, hitRadius: 90,
          description: 'The ocean separating the colonies from Britain. It took 6-8 weeks to cross by ship.' },
        { id: 'gulf-of-mexico', name: 'Gulf of Mexico', type: 'water',
          x: 340, y: 703, angle: 0, hitRadius: 80,
          description: 'The sea south of the colonies. France held its coast at New Orleans; Spain held Florida.' }
    ];

})();
