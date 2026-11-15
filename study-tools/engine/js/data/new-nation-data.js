// "The New Nation" map for Unit 3 (Building a Government): the eastern United
// States around 1790, with fifteen places from the unit. The teacher approved
// the list on Nov 14, 2026.
//
// Reuses CIVIL_WAR_MAP_BASE (modern state outlines, the Great Lakes and the
// main rivers, viewBox 0 0 900 725) and the colonial geography map's city
// positions and Appalachian line. Modern state borders are used because they
// are the ones students know; where a 1790 state was larger, the extra land is
// drawn in the same colour and counts as that state:
//   Maine was part of Massachusetts until 1820.
//   West Virginia was part of Virginia until 1863.
//
// Each place:
//   id, name, type ('state' | 'territory' | 'city' | 'river' | 'lakes' | 'mountain' | 'water')
//   states      base-map shapes that make up a state or territory
//   x, y        label point and the spot marked after a quiz answer
//   hitRiver    a base-map river whose drawn points a click may land near
//   hitPath     a polyline a click may land near
//   hitRadius   how near, in viewBox units
//   fact        two or three plain sentences for Explore and after an answer
(function() {
    'use strict';

    // The Appalachian crest, as traced for the colonial geography map
    var APPALACHIANS = [
        [710, 108], [677, 170], [632, 231], [557, 290], [530, 334],
        [503, 394], [467, 438], [437, 478], [407, 505], [392, 533], [383, 558]
    ];

    window.NEW_NATION_MAP = {
        viewBox: '150 0 750 725',

        // The thirteen states, shaded as the United States in 1790
        originalStates: [
            'Massachusetts', 'Maine', 'New Hampshire', 'Connecticut', 'Rhode Island',
            'New York', 'New Jersey', 'Pennsylvania', 'Delaware', 'Maryland',
            'Virginia', 'West Virginia', 'North Carolina', 'South Carolina', 'Georgia'
        ],
        // Base-map shapes drawn as part of another state, with a dashed border
        partOf: { 'Maine': 'Massachusetts', 'West Virginia': 'Virginia' },

        abbreviations: {
            'Massachusetts': 'MA', 'New Hampshire': 'NH', 'Connecticut': 'CT', 'Rhode Island': 'RI',
            'New York': 'NY', 'New Jersey': 'NJ', 'Pennsylvania': 'PA', 'Delaware': 'DE',
            'Maryland': 'MD', 'Virginia': 'VA', 'North Carolina': 'NC', 'South Carolina': 'SC',
            'Georgia': 'GA'
        },
        // Label points where the shape's centre would collide; null for no label
        labelAt: {
            'Pennsylvania': [600, 300], 'Massachusetts': [745, 210], 'Delaware': [676, 352],
            'Virginia': [590, 395], 'New York': [655, 205], 'New Hampshire': [758, 165], 'New Jersey': [682, 298],
            'Connecticut': null, 'Rhode Island': null
        },

        // Labels in Explore for land outside the United States in 1790
        contextLabels: [
            { text: 'SPANISH LOUISIANA', x: 175, y: 420, angle: -90 },
            { text: 'SPANISH FLORIDA', x: 470, y: 690, angle: 0 },
            { text: 'BRITISH CANADA', x: 560, y: 70, angle: 0 }
        ],

        places: [
            { id: 'massachusetts', name: 'Massachusetts', type: 'state', states: ['Massachusetts', 'Maine'],
              fact: 'In 1786 and 1787, farmers in western Massachusetts led by Daniel Shays closed courts to stop them from taking farms for unpaid debts and taxes. Shays\' Rebellion convinced many leaders that the national government under the Articles was too weak. Maine was part of Massachusetts until 1820.' },
            { id: 'virginia', name: 'Virginia', type: 'state', states: ['Virginia', 'West Virginia'],
              fact: 'Virginia\'s delegates brought the Virginia Plan to the Constitutional Convention in 1787. Written mostly by James Madison, it gave the large states more votes in Congress, based on population. West Virginia was part of Virginia until 1863.' },
            { id: 'new-jersey', name: 'New Jersey', type: 'state', states: ['New Jersey'],
              fact: 'William Paterson of New Jersey offered the New Jersey Plan at the Convention. It gave every state one equal vote in Congress, which protected the small states.' },
            { id: 'connecticut', name: 'Connecticut', type: 'state', states: ['Connecticut'],
              fact: 'Roger Sherman and Oliver Ellsworth of Connecticut proposed the Great Compromise: seats in the House by population, and two senators for every state. It passed in July 1787 by one vote, and it is also called the Connecticut Compromise.' },
            { id: 'new-hampshire', name: 'New Hampshire', type: 'state', states: ['New Hampshire'],
              fact: 'On June 21, 1788, New Hampshire became the ninth state to ratify the Constitution. Nine states were needed, so its vote put the Constitution into effect.' },
            { id: 'rhode-island', name: 'Rhode Island', type: 'state', states: ['Rhode Island'],
              fact: 'Rhode Island was the only state that sent no delegates to the Constitutional Convention. It was also the last of the thirteen to ratify, in May 1790.' },
            { id: 'pennsylvania', name: 'Pennsylvania', type: 'state', states: ['Pennsylvania'],
              fact: 'The Constitutional Convention met in the Pennsylvania State House, now Independence Hall. Pennsylvania ratified the Constitution in December 1787, second after Delaware.' },
            { id: 'northwest-territory', name: 'Northwest Territory', type: 'territory',
              states: ['Ohio', 'Indiana', 'Illinois', 'Michigan', 'Wisconsin'], x: 385, y: 262,
              fact: 'Land north of the Ohio River that later became Ohio, Indiana, Illinois, Michigan, Wisconsin and part of Minnesota. The Northwest Ordinance of 1787 set up its government, a way for its parts to become states, and a ban on slavery. Shawnee, Miami, Lenape and other Native nations already lived there.' },
            { id: 'philadelphia', name: 'Philadelphia', type: 'city', x: 657, y: 311,
              fact: 'Delegates met here from May to September 1787 to write the Constitution. Philadelphia was also the nation\'s capital from 1790 to 1800.' },
            { id: 'new-york-city', name: 'New York City', type: 'city', x: 692, y: 282,
              fact: 'The first capital under the Constitution. George Washington took the oath of office as president at Federal Hall on April 30, 1789. The Federalist essays first appeared in New York newspapers.' },
            { id: 'mississippi-river', name: 'Mississippi River', type: 'river', hitRiver: 'Mississippi', hitRadius: 30,
              x: 196, y: 540, angle: -78,
              fact: 'The Treaty of Paris in 1783 made the Mississippi the western border of the United States. Spain held New Orleans at its mouth, so western farmers who shipped crops down the river depended on Spain.' },
            { id: 'ohio-river', name: 'Ohio River', type: 'river', hitRiver: 'Ohio', hitRadius: 30,
              x: 304, y: 391, angle: -28,
              fact: 'The southern edge of the Northwest Territory. Settlers floated west on it in flatboats, into lands where Native nations lived.' },
            { id: 'great-lakes', name: 'Great Lakes', type: 'lakes', hitRadius: 25,
              x: 470, y: 150,
              fact: 'The northern edge of the Northwest Territory and part of the border with British Canada. After 1783 Britain kept forts on the American side of the lakes, including Detroit, until 1796.' },
            { id: 'appalachian-mountains', name: 'Appalachian Mountains', type: 'mountain', hitPath: APPALACHIANS, hitRadius: 45,
              x: 468, y: 468, angle: -53,
              fact: 'The mountains between the coastal states and the West. By 1790, tens of thousands of settlers had crossed them into Kentucky, Tennessee and the Ohio Valley.' },
            { id: 'atlantic-ocean', name: 'Atlantic Ocean', type: 'water', hitRadius: 90,
              x: 780, y: 450, angle: -75,
              fact: 'The thirteen states lay along the Atlantic coast, and most of their trade crossed it by ship. Under the Articles, Congress could not tax that trade; under the Constitution, it could.' }
        ]
    };
})();
