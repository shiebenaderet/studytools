// Colonial Geography challenge map data.
// Reuses CIVIL_WAR_MAP_BASE for state outlines, lakes, and rivers.
// Adds major colonial-era cities and two forts, the Proclamation Line, and
// labeled features. Kept deliberately sparse: at classroom screen sizes the
// map is ~400px wide, and every extra marker crowds the ones that matter.
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
    // where that collides with a city or the Proclamation Line; null drops the
    // label (CT and RI are too small to label next to their neighbors).
    window.COLONIAL_GEO_COLONY_LABELS = {
        'Pennsylvania': [600, 300],
        'Massachusetts': [745, 210],
        'Delaware': [672, 352],
        'Connecticut': null,
        'Rhode Island': null
    };

    // The Midwest west of the Mississippi adds nothing here; crop it out so the
    // colonies get the screen space. New Orleans (x=210) stays in frame.
    window.COLONIAL_GEO_VIEWBOX = '150 0 750 725';

    // Optional per-place fields:
    //   marker: 'fort'    drawn as a star instead of a dot
    //   quiz: false       shown in Explore but never asked
    //   quiz: 'full'      asked only in the Full Challenge, not the City Quiz
    //   labelDx, labelDy  nudge the name label away from a neighbor
    window.COLONIAL_GEO_CITIES = [
        { id: 'boston', name: 'Boston', region: 'new-england', x: 780, y: 215,
          description: 'Founded 1630. Capital of Massachusetts. Site of the Boston Massacre (1770) and Boston Tea Party (1773).' },
        { id: 'new-york-city', name: 'New York City', region: 'middle', x: 692, y: 282,
          description: 'Major port at the mouth of the Hudson. Began as the Dutch colony of New Amsterdam (1624) before Britain took it in 1664.' },
        { id: 'philadelphia', name: 'Philadelphia', region: 'middle', x: 657, y: 311,
          description: 'Founded 1682 by William Penn. Largest colonial city. Meeting place of the Continental Congress and where the Declaration of Independence was signed (1776).' },
        { id: 'baltimore', name: 'Baltimore', region: 'southern', x: 614, y: 336, labelDy: 10,
          description: 'Founded 1729. Major port in Maryland. Named after Lord Baltimore, the colony\'s founder.' },
        { id: 'jamestown', name: 'Jamestown', region: 'southern', x: 609, y: 414,
          description: 'Founded 1607. First permanent English settlement in North America. Tobacco made it profitable. Williamsburg, the later capital, is a few miles away.' },
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
        { id: 'fort-duquesne', name: 'Fort Duquesne', region: 'french', marker: 'fort', x: 512, y: 294,
          description: 'French fort where the Allegheny and Monongahela rivers form the Ohio (modern Pittsburgh). Washington\'s 1754 clash nearby started the French & Indian War. Renamed Fort Pitt after the British took it in 1758.' },
        { id: 'fort-detroit', name: 'Fort Detroit', region: 'french', marker: 'fort', x: 421, y: 217,
          description: 'French fort on the strait between Lakes Erie and Huron. In 1763 Pontiac led Native nations against British forts around the Great Lakes and besieged this one for months.' }
    ];

    // Rivers the civil-war base lacks, drawn but not labeled. Same format as
    // its rivers array.
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
        { id: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'water',
          x: 780, y: 450, angle: -75, hitRadius: 90,
          description: 'The ocean separating the colonies from Britain. It took 6-8 weeks to cross by ship.' },
        { id: 'gulf-of-mexico', name: 'Gulf of Mexico', type: 'water',
          x: 340, y: 703, angle: 0, hitRadius: 80,
          description: 'The sea south of the colonies. France held its coast at New Orleans; Spain held Florida.' }
    ];

})();
