const { useState, useRef, useEffect } = React;

// Simple icon components using Unicode symbols - NO lucide dependency
const Icon = ({ symbol, size = 16, className = '' }) =>
  React.createElement(
    'span',
    {
      className: `inline-block ${className}`,
      style: { fontSize: `${size}px`, lineHeight: 1 }
    },
    symbol
  );

const Edit = (props) => Icon({ symbol: '✏️', ...props });
const Eye = (props) => Icon({ symbol: '👁️', ...props });
const Plus = (props) => Icon({ symbol: '➕', ...props });
const Trash2 = (props) => Icon({ symbol: '🗑️', ...props });
const Save = (props) => Icon({ symbol: '💾', ...props });
const Upload = (props) => Icon({ symbol: '📤', ...props });
const Lock = (props) => Icon({ symbol: '🔒', ...props });
const Unlock = (props) => Icon({ symbol: '🔓', ...props });
const X = (props) => Icon({ symbol: '✖️', ...props });

const GRID_SIZE = 20;
const TILE_WIDTH = 100;
const TILE_HEIGHT = 160;
const EDIT_PASSWORD = 'changeme123'; // CHANGE THIS PASSWORD!

// Angle hint configuration (helps find clean 0/45/90/etc. while dragging)
const ANGLE_GUIDES = [0, 45, 90, 135, 180, 225, 270, 315];
const ANGLE_TOLERANCE_DEG = 6; // show a guide when the segment is within ±6°
const HINT_LINE_LENGTH = 2000; // long enough to span the canvas

const initialData = {
  canvasWidth: 50, // Grid units (20px each)
  canvasHeight: 40, // Grid units (20px each)
  characters: [
    {
      id: '1',
      name: 'Wei Wuxian',
      pronunciation: 'Way Woo-shyen',
      titles: ['Yiling Patriarch'],
      nicknames: ['Wei Ying'],
      gridX: 10,
      gridY: 10,
      image: '',
      imagePosition: 'center',
      symbols: ['⚔️', '🌙'],
      statusSymbol: '💀',
      bio: 'Brilliant cultivator who created demonic cultivation',
      sect: 'yunmeng'
    },
    {
      id: '2',
      name: 'Lan Wangji',
      pronunciation: 'Lan Wong-jee',
      titles: ['Hanguang-Jun'],
      nicknames: ['Lan Zhan'],
      gridX: 25,
      gridY: 10,
      image: '',
      imagePosition: 'center',
      symbols: ['🎵', '❄️'],
      statusSymbol: '',
      bio: 'Righteous cultivator of the Lan Clan',
      sect: 'gusulan'
    }
  ],
  connections: [
    {
      id: 'c1',
      from: '1',
      to: '2',
      type: 'love',
      startSide: 'right',
      endSide: 'left',
      waypoints: []
      // labels: [] // will be added lazily when editing
    }
  ],
  legend: {
    lines: {
      love: { color: '#ff1493', style: 'solid', thickness: 3, label: 'Love' },
      family: { color: '#ff0000', style: 'solid', thickness: 2, label: 'Family' },
      rivalry: { color: '#ff8c00', style: 'dashed', thickness: 2, label: 'Rivalry' },
      friendship: { color: '#00ff00', style: 'solid', thickness: 2, label: 'Friendship' },
      mentor: { color: '#9370db', style: 'solid', thickness: 2, label: 'Mentor/Student' }
    },
    symbols: {
      '⚔️': 'Warrior',
      '🎵': 'Musician',
      '🌙': 'Demonic Cultivation',
      '❄️': 'Ice/Cold Affinity',
      '🔥': 'Fire Affinity',
      '💚': 'Healer',
      '👑': 'Royalty'
    },
    statusSymbols: {
      '💀': 'Deceased',
      '👻': 'Ghost',
      '🧟': 'Undead',
      '💤': 'Sleeping/Dormant',
      '🏥': 'Injured',
      '⚡': 'Powered Up'
    },
    sects: {
      gusulan: { name: 'Gusu Lan Clan', color: '#3b82f6' },
      yunmeng: { name: 'Yunmeng Jiang Clan', color: '#a855f7' },
      qinghe: { name: 'Qinghe Nie Clan', color: '#22c55e' },
      lanling: { name: 'Lanling Jin Clan', color: '#eab308' },
      qishan: { name: 'Qishan Wen Clan', color: '#ef4444' }
    }
  }
};

function AuthModal({ onAuthenticate, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password === EDIT_PASSWORD) {
      onAuthenticate();
      onClose();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return React.createElement(
    'div',
    {
      className:
        'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4',
      onClick: onClose
    },
    React.createElement(
      'div',
      {
        className: 'bg-gray-800 rounded-lg p-6 max-w-sm w-full',
        onClick: (e) => e.stopPropagation()
      },
      React.createElement(
        'div',
        { className: 'flex items-center justify-between mb-4' },
        React.createElement(
          'h2',
          { className: 'text-xl font-bold text-white flex items-center gap-2' },
          React.createElement(Lock, { size: 20 }),
          ' Enter Password'
        ),
        React.createElement(
          'button',
          {
            onClick: onClose,
            className: 'text-gray-400 hover:text-white'
          },
          React.createElement(X, { size: 20 })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement('input', {
          type: 'password',
          value: password,
          onChange: (e) => setPassword(e.target.value),
          onKeyDown: (e) => e.key === 'Enter' && handleSubmit(),
          className: 'w-full p-3 bg-gray-700 text-white rounded mb-2',
          placeholder: 'Enter edit password',
          autoFocus: true
        }),
        error &&
          React.createElement(
            'p',
            { className: 'text-red-400 text-sm mb-2' },
            error
          ),
        React.createElement(
          'button',
          {
            onClick: handleSubmit,
            className:
              'w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition'
          },
          'Unlock Edit Mode'
        )
      ),
      React.createElement(
        'p',
        { className: 'text-gray-400 text-xs mt-3' },
        'Edit mode is password protected to prevent unauthorized changes.'
      )
    )
  );
}

function CharacterTile({
  character,
  isEditing,
  onDragStart, // kept for compatibility if used elsewhere
  isHighlighted,
  isDimmed,
  sectColor,
  onClick,
  // NEW multi-select props
  isSelected = false,
  onPrimarySelect,
  onToggleSelect,
  onMouseDownStart
}) {
  const bannerHeight = 40; // Height of name/title banner
  const imageHeight = TILE_HEIGHT - bannerHeight;

  const getObjectPosition = (position) => {
    const positions = {
      top: '50% 0%',
      center: '50% 50%',
      bottom: '50% 100%',
      'top-left': '0% 0%',
      'top-right': '100% 0%',
      'bottom-left': '0% 100%',
      'bottom-right': '100% 100%'
    };
    return positions[position] || '50% 50%';
  };

  return React.createElement(
    'div',
    {
      className: `absolute ${
        isEditing ? 'cursor-move' : 'cursor-pointer'
      } transition-all ${
        isHighlighted ? 'z-20 scale-110' : isDimmed ? 'opacity-30' : 'opacity-100'
      }`,
      style: {
        left: character.gridX * GRID_SIZE,
        top: character.gridY * GRID_SIZE,
        width: TILE_WIDTH,
        height: TILE_HEIGHT
      },
      onClick: (e) => {
        e.stopPropagation();
        // Prefer built-in multi-select handlers if present
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          onToggleSelect && onToggleSelect();
        } else if (onPrimarySelect) {
          onPrimarySelect();
        } else if (onClick) {
          // Fallback to legacy click behavior if parent provided one
          onClick(e);
        }
      },
      // selection + drag initiation handled on mousedown
      onMouseDown: onMouseDownStart,
      draggable: false
    },
    React.createElement(
      'div',
      {
        className: `relative w-full h-full border-2 ${
          isHighlighted
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
            : isSelected
            ? 'border-blue-400 shadow-lg shadow-blue-400/30'
            : 'border-gray-700'
        } rounded-lg overflow-hidden bg-gray-800 ${
          isHighlighted
            ? 'ring-4 ring-yellow-400/50'
            : isSelected
            ? 'ring-2 ring-blue-400/30'
            : ''
        }`
      },
      React.createElement(
        'div',
        {
          className: 'w-full',
          style: { height: `${imageHeight}px` }
        },
        character.image
          ? React.createElement('img', {
              src: character.image,
              alt: character.name,
              className: 'w-full h-full object-cover',
              style: {
                objectPosition: getObjectPosition(character.imagePosition || 'center')
              }
            })
          : React.createElement(
              'div',
              {
                className:
                  'w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-4xl'
              },
              '?'
            )
      ),
      character.statusSymbol &&
        React.createElement(
          'div',
          {
            className: 'absolute top-1 right-1 text-3xl opacity-90'
          },
          character.statusSymbol
        ),
      React.createElement(
        'div',
        {
          className: 'absolute bottom-0 left-0 right-0 text-white text-center',
          style: {
            backgroundColor: sectColor || 'rgba(0, 0, 0, 0.8)',
            height: `${bannerHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '4px'
          }
        },
        React.createElement(
          'div',
          { className: 'text-xs font-bold truncate leading-tight' },
          character.name
        ),
        character.titles?.[0] &&
          React.createElement(
            'div',
            {
              className: 'text-xs opacity-90 truncate leading-tight'
            },
            character.titles[0]
          )
      ),
      character.symbols &&
        character.symbols.length > 0 &&
        React.createElement(
          'div',
          {
            className: 'absolute top-1 left-1 flex gap-0.5 flex-wrap max-w-[60%]'
          },
          character.symbols.slice(0, 4).map((symbol, i) =>
            React.createElement('span', { key: i, className: 'text-sm' }, symbol)
          )
        )
    )
  );
}

/**
 * ConnectionLine
 * Now supports multiple labels per connection (connection.labels[]).
 * Each label: { id, segmentIndex, t, side }
 * side ∈ {'auto','top','bottom','left','right'}
 */
function ConnectionLine({
  connection,
  characters,
  legend,
  isEditing,
  onWaypointDrag,
  onAddWaypoint,
  onDeleteWaypoint,
  selectedConnection,
  onLabelDragStart,
  onConnectionClick
}) {
  const fromChar = characters.find((c) => c.id === connection.from);
  const toChar = characters.find((c) => c.id === connection.to);

  if (!fromChar || !toChar) return null;

  const lineStyle =
    legend.lines[connection.type] || { color: '#ffffff', style: 'solid', thickness: 2 };

  const getConnectionPoint = (char, side) => {
    const baseX = char.gridX * GRID_SIZE + TILE_WIDTH / 2;
    const baseY = char.gridY * GRID_SIZE + TILE_HEIGHT / 2;
    switch (side) {
      case 'top':
        return { x: baseX, y: char.gridY * GRID_SIZE };
      case 'bottom':
        return { x: baseX, y: char.gridY * GRID_SIZE + TILE_HEIGHT };
      case 'left':
        return { x: char.gridX * GRID_SIZE, y: baseY };
      case 'right':
        return { x: char.gridX * GRID_SIZE + TILE_WIDTH, y: baseY };
      default:
        return { x: baseX, y: baseY };
    }
  };

  const start = getConnectionPoint(fromChar, connection.startSide || 'right');
  const end = getConnectionPoint(toChar, connection.endSide || 'left');
  const waypoints = connection.waypoints || [];
  const allPoints = [start, ...waypoints, end];

  const pathD = allPoints
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ');
  const strokeDasharray =
    lineStyle.style === 'dashed'
      ? '8,4'
      : lineStyle.style === 'dotted'
      ? '2,4'
      : 'none';
  const isSelected = selectedConnection === connection.id;

  // --- Angle hint helpers ---
  const toDeg = (rad) => ((rad * 180) / Math.PI + 360) % 360;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const angleBetween = (a, b) => toDeg(Math.atan2(b.y - a.y, b.x - a.x));
  const circDiff = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  const nearestGuide = (deg) =>
    ANGLE_GUIDES.reduce(
      (best, g) => {
        const diff = circDiff(deg, g);
        return diff < best.diff ? { guide: g, diff } : best;
      },
      { guide: 0, diff: 999 }
    );

  /**
   * Build translucent, dashed "hint lines" for segments that are currently
   * within ANGLE_TOLERANCE_DEG of a tidy angle (0/45/90/etc.). These display
   * while editing and make it easier to visually "land" on the clean angle
   * without forcing a snap.
   * All hint drawings are wrapped in an SVG group with pointerEvents="none"
   * to guarantee the hints never intercept drag/click events.
   */
  const renderAngleHints = () => {
    if (!isEditing || !isSelected) return null;
    const elems = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const a = allPoints[i];
      const b = allPoints[i + 1];
      const segAngle = angleBetween(a, b);
      const { guide, diff } = nearestGuide(segAngle);
      if (diff <= ANGLE_TOLERANCE_DEG) {
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const ux = Math.cos(toRad(guide));
        const uy = Math.sin(toRad(guide));
        const x1 = midX - ux * HINT_LINE_LENGTH;
        const y1 = midY - uy * HINT_LINE_LENGTH;
        const x2 = midX + ux * HINT_LINE_LENGTH;
        const y2 = midY + uy * HINT_LINE_LENGTH;

        elems.push(
          React.createElement('line', {
            key: `hint-line-${connection.id}-${i}`,
            x1,
            y1,
            x2,
            y2,
            stroke: 'rgba(56,189,248,0.6)',
            strokeWidth: 1,
            strokeDasharray: '3,6'
          })
        );
        elems.push(
          React.createElement(
            'g',
            { key: `hint-badge-${connection.id}-${i}` },
            React.createElement('rect', {
              x: midX + 8,
              y: midY - 10,
              width: 34,
              height: 16,
              rx: 3,
              fill: 'rgba(17,24,39,0.85)',
              stroke: 'rgba(56,189,248,0.6)',
              strokeWidth: 1
            }),
            React.createElement(
              'text',
              {
                x: midX + 25,
                y: midY + 2,
                fill: 'rgba(191,219,254,0.95)',
                fontSize: 10,
                textAnchor: 'middle'
              },
              `${guide}°`
            )
          )
        );
      }
    }
    return React.createElement('g', { pointerEvents: 'none' }, elems);
  };

  // --- Label helpers ---
  const labelText = `${fromChar.name} → ${toChar.name}`;
  const estimateTextWidth = (text) => Math.max(40, text.length * 6); // conservative estimate
  const LABEL_HEIGHT = 16; // px
  const LABEL_PADDING_X = 4; // px each side
  const EDGE_OFFSET = 5; // distance from line to the nearest edge of the label box

  const pointOnSegment = (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  });
  const normalize = (vx, vy) => {
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  };

  const defaultLabels = () => {
    const lastSeg = Math.max(0, allPoints.length - 2);
    // Default two labels near endpoints
    return [
      { id: 'start', segmentIndex: 0, t: Math.min(0.1, 0.9), side: 'auto' },
      { id: 'end', segmentIndex: lastSeg, t: 0.9, side: 'auto' }
    ];
  };

  const labelsArray =
    (connection.labels && connection.labels.length && connection.labels) ||
    defaultLabels();

  const renderLabel = (label) => {
    const segIndex = Math.max(0, Math.min(allPoints.length - 2, label.segmentIndex || 0));
    const a = allPoints[segIndex];
    const b = allPoints[segIndex + 1];

    const base = pointOnSegment(a, b, Math.max(0, Math.min(1, label.t ?? 0.5)));
    const tangent = normalize(b.x - a.x, b.y - a.y);
    const normal = { x: -tangent.y, y: tangent.x };

    const textWidth = estimateTextWidth(labelText) + 2 * LABEL_PADDING_X;

    // Position label center based on desired side
    let cx = base.x;
    let cy = base.y;

    const yOffset = EDGE_OFFSET + LABEL_HEIGHT / 2;
    const xOffset = EDGE_OFFSET + textWidth / 2;

    switch (label.side || 'auto') {
      case 'top':
        cy = base.y - yOffset;
        break;
      case 'bottom':
        cy = base.y + yOffset;
        break;
      case 'left':
        cx = base.x - xOffset;
        break;
      case 'right':
        cx = base.x + xOffset;
        break;
      case 'auto':
      default:
        // Perpendicular to line (left-hand normal). Guarantees 5px from line edge.
        cx = base.x + normal.x * (EDGE_OFFSET + LABEL_HEIGHT / 2);
        cy = base.y + normal.y * (EDGE_OFFSET + LABEL_HEIGHT / 2);
        break;
    }

    const rectX = cx - textWidth / 2;
    const rectY = cy - LABEL_HEIGHT / 2;

    return React.createElement(
      'g',
      {
        key: `label-${label.id}`,
        className: `${isEditing ? 'cursor-move' : ''}`,
        onMouseDown: (e) => {
          if (!isEditing) return;
          e.stopPropagation();
          onLabelDragStart && onLabelDragStart(connection.id, label.id, e);
        },
        onClick: (e) => {
          if (!isEditing) return;
          e.stopPropagation();
          onConnectionClick && onConnectionClick(connection.id);
        }
      },
      React.createElement('rect', {
        x: rectX,
        y: rectY,
        width: textWidth,
        height: LABEL_HEIGHT,
        fill: 'rgba(0,0,0,0.8)',
        rx: 3
      }),
      React.createElement(
        'text',
        {
          x: cx,
          y: cy + 4, // rough vertical centering
          fill: lineStyle.color,
          fontSize: 12,
          textAnchor: 'middle',
          className: 'font-semibold pointer-events-none'
        },
        labelText
      )
    );
  };

  // --- Path interaction helpers (add waypoint by clicking the line) ---
  const getSVGRelativePoint = (event) => {
    // Works assuming the SVG is not transformed (no scale/rotate). Good enough for our canvas.
    const svg = event.currentTarget.ownerSVGElement || event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };
  const distPointToSeg = (px, py, ax, ay, bx, by) => {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby || 1;
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    const dx = px - cx, dy = py - cy;
    return { d2: dx * dx + dy * dy, t, cx, cy };
  };
  const findNearestSegment = (pt) => {
    let best = { idx: 0, d2: Infinity, t: 0, cx: pt.x, cy: pt.y };
    for (let i = 0; i < allPoints.length - 1; i++) {
      const a = allPoints[i];
      const b = allPoints[i + 1];
      const res = distPointToSeg(pt.x, pt.y, a.x, a.y, b.x, b.y);
      if (res.d2 < best.d2) best = { idx: i, d2: res.d2, t: res.t, cx: res.cx, cy: res.cy };
    }
    return best;
  };
  const onPathMouseDown = (e) => {
    if (!isEditing || !isSelected) return;
    e.stopPropagation();
    const pt = getSVGRelativePoint(e);
    const { idx, cx, cy } = findNearestSegment(pt);
    // Insert a waypoint at the closest point on the nearest segment
    onAddWaypoint && onAddWaypoint(connection.id, idx, cx, cy);
    // NOTE: We don't auto-start drag here (state update is async). Grab the new handle to drag.
  };

  return React.createElement(
    'g',
    {
      onClick: (e) => {
        if (!isEditing) return;
        e.stopPropagation();
        onConnectionClick && onConnectionClick(connection.id);
      }
    },
    React.createElement('path', {
      d: pathD,
      stroke: lineStyle.color,
      strokeWidth: lineStyle.thickness,
      strokeDasharray,
      fill: 'none'
    }),
    // Invisible, fat hit-area over the line to add a waypoint where you click
    isEditing && isSelected &&
      React.createElement('path', {
        d: pathD,
        stroke: 'transparent',
        strokeWidth: Math.max(14, (lineStyle.thickness || 2) * 4),
        fill: 'none',
        pointerEvents: 'stroke', // only the stroke is clickable
        onMouseDown: onPathMouseDown
      }),
    React.createElement('circle', { cx: start.x, cy: start.y, r: 4, fill: lineStyle.color }),
    isEditing &&
      isSelected &&
      waypoints.map((wp, i) =>
        React.createElement(
          'g',
          { key: i },
          React.createElement('circle', {
            cx: wp.x,
            cy: wp.y,
            r: 6,
            fill: lineStyle.color,
            stroke: 'white',
            strokeWidth: 2,
            className: 'cursor-move',
            onMouseDown: (e) => {
              e.stopPropagation();
              onWaypointDrag(connection.id, i, e);
            }
          }),
          React.createElement('circle', {
            cx: wp.x + 12,
            cy: wp.y - 12,
            r: 8,
            fill: 'red',
            className: 'cursor-pointer',
            onClick: (e) => {
              e.stopPropagation();
              onDeleteWaypoint(connection.id, i);
            }
          }),
          React.createElement(
            'text',
            {
              x: wp.x + 12,
              y: wp.y - 9,
              fill: 'white',
              fontSize: 10,
              textAnchor: 'middle',
              className: 'pointer-events-none'
            },
            '×'
          )
        )
      ),
    isEditing &&
      isSelected &&
      allPoints.slice(0, -1).map((point, i) => {
        const nextPoint = allPoints[i + 1];
        const midX = (point.x + nextPoint.x) / 2;
        const midY = (point.y + nextPoint.y) / 2;
        return React.createElement('circle', {
          key: `add-${i}`,
          cx: midX,
          cy: midY,
          r: 5,
          fill: 'green',
          stroke: 'white',
          strokeWidth: 1,
          className: 'cursor-pointer',
          onClick: (e) => {
            e.stopPropagation();
            onAddWaypoint(connection.id, i, midX, midY);
          }
        });
      }),
    // Angle hint overlays (non-interactive; drawn under labels/handles)
    renderAngleHints(),
    // Labels
    ...(labelsArray || []).map((lbl) => renderLabel(lbl))
  );
}

function CharacterModal({
  character,
  legend,
  onClose,
  connections,
  allCharacters
}) {
  const characterConnections = connections.filter(
    (c) => c.from === character.id || c.to === character.id
  );

  return React.createElement(
    'div',
    {
      className:
        'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4',
      onClick: onClose
    },
    React.createElement(
      'div',
      {
        className: 'bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto',
        onClick: (e) => e.stopPropagation()
      },
      React.createElement(
        'div',
        { className: 'flex items-start gap-4 mb-4' },
        character.image &&
          React.createElement('img', {
            src: character.image,
            alt: character.name,
            className: 'w-24 h-24 object-cover rounded'
          }),
        React.createElement(
          'div',
          { className: 'flex-1' },
          React.createElement(
            'h2',
            { className: 'text-2xl font-bold text-white mb-1' },
            character.name
          ),
          character.pronunciation &&
            React.createElement(
              'p',
              {
                className: 'text-gray-400 text-sm mb-2'
              },
              `(${character.pronunciation})`
            )
        )
      ),
      character.titles &&
        character.titles.length > 0 &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Titles:'
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1' },
            character.titles.map((title, i) =>
              React.createElement(
                'span',
                {
                  key: i,
                  className: 'bg-purple-600 text-white text-xs px-2 py-1 rounded'
                },
                title
              )
            )
          )
        ),
      character.nicknames &&
        character.nicknames.length > 0 &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Nicknames:'
          ),
          React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1' },
            character.nicknames.map((nick, i) =>
              React.createElement(
                'span',
                {
                  key: i,
                  className: 'bg-blue-600 text-white text-xs px-2 py-1 rounded'
                },
                nick
              )
            )
          )
        ),
      character.bio &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Bio:'
          ),
          React.createElement('p', { className: 'text-white text-sm' }, character.bio)
        ),
      character.sect &&
        legend.sects?.[character.sect] &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Sect/Faction:'
          ),
          React.createElement(
            'div',
            { className: 'flex items-center gap-2' },
            React.createElement('div', {
              className: 'w-4 h-4 rounded',
              style: { backgroundColor: legend.sects[character.sect].color }
            }),
            React.createElement(
              'span',
              { className: 'text-white text-sm' },
              legend.sects[character.sect].name
            )
          )
        ),
      character.symbols &&
        character.symbols.length > 0 &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Symbols:'
          ),
          React.createElement(
            'div',
            { className: 'space-y-1' },
            character.symbols.map((symbol, i) =>
              React.createElement(
                'div',
                {
                  key: i,
                  className: 'text-white text-sm flex items-center gap-2'
                },
                React.createElement('span', { className: 'text-lg' }, symbol),
                React.createElement('span', null, legend.symbols[symbol] || 'Unknown')
              )
            )
          )
        ),
      character.statusSymbol &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Status:'
          ),
          React.createElement(
            'div',
            { className: 'text-white text-sm flex items-center gap-2' },
            React.createElement('span', { className: 'text-2xl' }, character.statusSymbol),
            React.createElement(
              'span',
              null,
              legend.statusSymbols?.[character.statusSymbol] || 'Unknown'
            )
          )
        ),
      characterConnections.length > 0 &&
        React.createElement(
          'div',
          { className: 'mb-3' },
          React.createElement(
            'h3',
            { className: 'text-sm font-semibold text-gray-300 mb-1' },
            'Connections:'
          ),
          React.createElement(
            'div',
            { className: 'space-y-1' },
            characterConnections.map((conn, i) => {
              const otherChar = allCharacters.find(
                (c) => c.id === (conn.from === character.id ? conn.to : conn.from)
              );
              const lineStyle = legend.lines[conn.type];
              return React.createElement(
                'div',
                {
                  key: i,
                  className: 'text-white text-sm flex items-center gap-2'
                },
                React.createElement('div', {
                  className: 'w-12 h-0.5',
                  style: {
                    backgroundColor: lineStyle?.color || '#fff',
                    borderStyle: lineStyle?.style === 'dashed' ? 'dashed' : 'solid',
                    borderWidth: lineStyle?.style === 'dashed' ? '1px 0 0 0' : '0'
                  }
                }),
                React.createElement('span', null, lineStyle?.label || conn.type),
                React.createElement('span', { className: 'text-gray-400' }, 'with'),
                React.createElement('span', null, otherChar?.name || 'Unknown')
              );
            })
          )
        ),
      React.createElement(
        'button',
        {
          onClick: onClose,
          className:
            'w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition'
        },
        'Close'
      )
    )
  );
}

function Legend({ legend, isMinimized, onToggleMinimize }) {
  if (isMinimized) {
    return React.createElement(
      'div',
      {
        className:
          'bg-gray-900 bg-opacity-95 p-3 rounded-lg cursor-pointer hover:bg-opacity-100 transition shadow-lg',
        onClick: onToggleMinimize
      },
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        React.createElement('h3', { className: 'text-white font-bold text-sm' }, 'Legend'),
        React.createElement('span', { className: 'text-white text-xs' }, '▶')
      )
    );
  }

  return React.createElement(
    'div',
    {
      className:
        'bg-gray-900 bg-opacity-95 p-4 rounded-lg max-h-[90vh] overflow-y-auto shadow-lg',
      style: { minWidth: '250px', maxWidth: '300px' }
    },
    React.createElement(
      'div',
      {
        className:
          'flex items-center justify-between mb-3 cursor-pointer',
        onClick: onToggleMinimize
      },
      React.createElement('h3', { className: 'text-white font-bold text-lg' }, 'Legend'),
      React.createElement(
        'span',
        { className: 'text-white text-sm hover:text-gray-300' },
        '◀'
      )
    ),
    React.createElement(
      'div',
      { className: 'mb-4' },
      React.createElement(
        'h4',
        { className: 'text-white font-semibold mb-2 text-sm' },
        'Relationships'
      ),
      React.createElement(
        'div',
        { className: 'space-y-2' },
        Object.entries(legend.lines).map(([key, style]) =>
          React.createElement(
            'div',
            {
              key,
              className: 'flex items-center gap-2 text-white text-sm'
            },
            React.createElement('div', {
              className: 'w-12 h-0',
              style: {
                borderTop: `${style.thickness}px ${style.style} ${style.color}`
              }
            }),
            React.createElement('span', null, style.label)
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'mb-4' },
      React.createElement(
        'h4',
        { className: 'text-white font-semibold mb-2 text-sm' },
        'Trait Symbols'
      ),
      React.createElement(
        'div',
        { className: 'space-y-1' },
        Object.entries(legend.symbols).map(([symbol, meaning]) =>
          React.createElement(
            'div',
            {
              key: symbol,
              className: 'flex items-center gap-2 text-white text-sm'
            },
            React.createElement('span', { className: 'text-lg' }, symbol),
            React.createElement('span', null, meaning)
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'mb-4' },
      React.createElement(
        'h4',
        { className: 'text-white font-semibold mb-2 text-sm' },
        'Status Symbols'
      ),
      React.createElement(
        'div',
        { className: 'space-y-1' },
        Object.entries(legend.statusSymbols || {}).map(([symbol, meaning]) =>
          React.createElement(
            'div',
            {
              key: symbol,
              className: 'flex items-center gap-2 text-white text-sm'
            },
            React.createElement('span', { className: 'text-lg' }, symbol),
            React.createElement('span', null, meaning)
          )
        )
      )
    ),
    legend.sects &&
      Object.keys(legend.sects).length > 0 &&
      React.createElement(
        'div',
        null,
        React.createElement(
          'h4',
          { className: 'text-white font-semibold mb-2 text-sm' },
          'Sects/Factions'
        ),
        React.createElement(
          'div',
          { className: 'space-y-1' },
          Object.entries(legend.sects).map(([key, sect]) =>
            React.createElement(
              'div',
              {
                key,
                className: 'flex items-center gap-2 text-white text-sm'
              },
              React.createElement('div', {
                className: 'w-4 h-4 rounded',
                style: { backgroundColor: sect.color }
              }),
              React.createElement('span', null, sect.name)
            )
          )
        )
      )
  );
}

function EditPanel({
    data,
    setData,
    selectedCharacter,
    setSelectedCharacter,
    selectedConnection,
    setSelectedConnection,
    activeTab,
    setActiveTab,
    publishCfg,
    savePublishCfg,
    onPublish
  }) {
  const [commitMsg, setCommitMsg] = useState('Update data.json from app');
  const addCharacter = () => {
    const newChar = {
      id: Date.now().toString(),
      name: 'New Character',
      pronunciation: '',
      titles: [],
      nicknames: [],
      gridX: 0,
      gridY: 0,
      image: '',
      imagePosition: 'center',
      symbols: [],
      statusSymbol: '',
      bio: '',
      sect: ''
    };
    setData({ ...data, characters: [...data.characters, newChar] });
  };

  const updateCharacter = (id, updates) => {
    const newCharacters = data.characters.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    setData({
      ...data,
      characters: newCharacters
    });
    if (selectedCharacter && selectedCharacter.id === id) {
      setSelectedCharacter(newCharacters.find((c) => c.id === id));
    }
  };

  const deleteCharacter = (id) => {
    setData({
      ...data,
      characters: data.characters.filter((c) => c.id !== id),
      connections: data.connections.filter((c) => c.from !== id && c.to !== id)
    });
    setSelectedCharacter(null);
  };

  const addConnection = () => {
    const newConn = {
      id: Date.now().toString(),
      from: data.characters[0]?.id || '',
      to: data.characters[1]?.id || '',
      type: Object.keys(data.legend.lines)[0] || 'friendship',
      startSide: 'right',
      endSide: 'left',
      waypoints: [],
      labels: [
        { id: 'start', segmentIndex: 0, t: 0.1, side: 'auto' },
        { id: 'end', segmentIndex: 0, t: 0.9, side: 'auto' }
      ]
    };
    setData({ ...data, connections: [...data.connections, newConn] });
  };

  const updateConnection = (id, updates) => {
    setData({
      ...data,
      connections: data.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const deleteConnection = (id) => {
    setData({
      ...data,
      connections: data.connections.filter((c) => c.id !== id)
    });
    setSelectedConnection(null);
  };

  const updateLegend = (category, key, updates) => {
    const newLegend = { ...data.legend };
    if (updates === null) {
      delete newLegend[category][key];
    } else {
      if (key === null) {
        // handled externally when symbol keys change
      } else {
        newLegend[category][key] = { ...newLegend[category][key], ...updates };
      }
    }
    setData({ ...data, legend: newLegend });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-map-data.json';
    a.click();
  };

  const importData = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (!imported.canvasWidth) imported.canvasWidth = 50;
          if (!imported.canvasHeight) imported.canvasHeight = 40;
          if (!imported.legend.sects) imported.legend.sects = {};
          if (!imported.legend.statusSymbols) imported.legend.statusSymbols = {};
          imported.characters = imported.characters.map((char) => ({
            ...char,
            imagePosition: char.imagePosition || 'center'
          }));
          setData(imported);
        } catch (err) {
          alert('Error importing file');
        }
      };
      reader.readAsText(file);
    }
  };

  const publishSection = React.createElement(
    'div',
    { className: 'mt-3 p-3 bg-blue-900 bg-opacity-20 border border-blue-700 rounded space-y-2' },
    React.createElement(
      'div',
      { className: 'text-sm font-semibold' },
      'Publish (Global): Update data.json on GitHub'
    ),
    React.createElement(
      'div',
      { className: 'grid grid-cols-2 gap-2 text-xs' },
      React.createElement(
        'label',
        { className: 'block' },
        'Owner:',
        React.createElement('input', {
          type: 'text',
          value: publishCfg.owner || '',
          onChange: (e) => savePublishCfg({ ...publishCfg, owner: e.target.value }),
          className: 'w-full mt-1 p-2 bg-gray-700 rounded'
        })
      ),
      React.createElement(
        'label',
        { className: 'block' },
        'Repo:',
        React.createElement('input', {
          type: 'text',
          value: publishCfg.repo || '',
          onChange: (e) => savePublishCfg({ ...publishCfg, repo: e.target.value }),
          className: 'w-full mt-1 p-2 bg-gray-700 rounded'
        })
      ),
      React.createElement(
        'label',
        { className: 'block' },
        'Branch:',
        React.createElement('input', {
          type: 'text',
          value: publishCfg.branch || 'main',
          onChange: (e) => savePublishCfg({ ...publishCfg, branch: e.target.value }),
          className: 'w-full mt-1 p-2 bg-gray-700 rounded',
          placeholder: 'main'
        })
      ),
      React.createElement(
        'label',
        { className: 'block' },
        'Path:',
        React.createElement('input', {
          type: 'text',
          value: publishCfg.path || 'data.json',
          onChange: (e) => savePublishCfg({ ...publishCfg, path: e.target.value }),
          className: 'w-full mt-1 p-2 bg-gray-700 rounded',
          placeholder: 'data.json'
        })
      )
    ),
    React.createElement(
      'label',
      { className: 'block text-xs' },
      'GitHub Token (fine-grained, Contents: Read/Write):',
      React.createElement('input', {
        type: 'password',
        value: publishCfg.token || '',
        onChange: (e) => savePublishCfg({ ...publishCfg, token: e.target.value }),
        className: 'w-full mt-1 p-2 bg-gray-700 rounded',
        placeholder: 'ghp_…'
      })
    ),
    React.createElement(
      'label',
      { className: 'block text-xs' },
      'Commit message:',
      React.createElement('input', {
        type: 'text',
        value: commitMsg,
        onChange: (e) => setCommitMsg(e.target.value),
        className: 'w-full mt-1 p-2 bg-gray-700 rounded',
        placeholder: 'Update data.json from app'
      })
    ),
    React.createElement(
      'div',
      { className: 'grid grid-cols-2 gap-2' },
      React.createElement(
        'button',
        {
          onClick: () => savePublishCfg({ ...publishCfg }),
          className: 'bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm'
        },
        'Save Settings'
      ),
      React.createElement(
        'button',
        {
          onClick: () => onPublish && onPublish(commitMsg),
          className: 'bg-green-600 hover:bg-green-700 py-2 rounded text-sm'
        },
        'Publish Now'
      )
    ),
    React.createElement(
      'p',
      { className: 'text-[11px] text-gray-400' },
      'Token is stored only in your browser (localStorage) and sent directly to GitHub when you Publish. Use a fine-grained token scoped to this repo, Contents: Read/Write, and set an expiration.'
    )
  );

  // Helpers for label section
  const sideOptions = [
    ['auto', 'Auto (perpendicular)'],
    ['top', 'Top'],
    ['right', 'Right'],
    ['bottom', 'Bottom'],
    ['left', 'Left']
  ];

  return React.createElement(
    'div',
    {
      className: 'bg-gray-900 text-white p-4 overflow-y-auto',
      style: { height: '100vh' }
    },
    React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Editor'),
    React.createElement(
      'div',
      { className: 'flex gap-2 mb-4' },
      ['canvas', 'characters', 'connections', 'legend'].map((tab) =>
        React.createElement(
          'button',
          {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `px-3 py-1 rounded text-sm ${
              activeTab === tab ? 'bg-blue-600' : 'bg-gray-700'
            }`
          },
          tab.charAt(0).toUpperCase() + tab.slice(1)
        )
      )
    ),

    // CANVAS
    activeTab === 'canvas' &&
      React.createElement(
        'div',
        null,
        React.createElement(
          'h3',
          { className: 'font-semibold mb-3 text-sm' },
          'Canvas Size'
        ),
        React.createElement(
          'p',
          { className: 'text-xs text-gray-400 mb-3' },
          'Expand the canvas to create more space for placing characters. Each tile is 100×160px and takes up 5×8 grid units.'
        ),
        React.createElement(
          'div',
          { className: 'grid grid-cols-2 gap-3 mb-3' },
          React.createElement(
            'label',
            { className: 'block text-xs' },
            'Width (grid units):',
            React.createElement('input', {
              type: 'number',
              value: data.canvasWidth,
              onChange: (e) =>
                setData({
                  ...data,
                  canvasWidth: Math.max(20, parseInt(e.target.value) || 20)
                }),
              onClick: (e) => e.stopPropagation(),
              className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
              min: 20,
              max: 200
            })
          ),
          React.createElement(
            'label',
            { className: 'block text-xs' },
            'Height (grid units):',
            React.createElement('input', {
              type: 'number',
              value: data.canvasHeight,
              onChange: (e) =>
                setData({
                  ...data,
                  canvasHeight: Math.max(20, parseInt(e.target.value) || 20)
                }),
              onClick: (e) => e.stopPropagation(),
              className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
              min: 20,
              max: 200
            })
          )
        ),
        React.createElement(
          'div',
          { className: 'bg-gray-800 p-3 rounded text-xs' },
          React.createElement(
            'div',
            { className: 'mb-2' },
            React.createElement('strong', null, 'Current Size: '),
            `${data.canvasWidth} × ${data.canvasHeight} grid units`
          ),
          React.createElement(
            'div',
            { className: 'mb-2' },
            React.createElement('strong', null, 'Pixel Size: '),
            `${data.canvasWidth * GRID_SIZE} × ${data.canvasHeight * GRID_SIZE} px`
          ),
          React.createElement(
            'div',
            { className: 'mb-2' },
            React.createElement('strong', null, 'Characters: '),
            `${data.characters.length} placed`
          ),
          React.createElement(
            'div',
            { className: 'mb-2' },
            React.createElement('strong', null, 'Grid Positions: '),
            `(0, 0) to (${data.canvasWidth - 1}, ${data.canvasHeight - 1})`
          ),
          React.createElement(
            'div',
            { className: 'text-gray-400' },
            `💡 Grid unit = ${GRID_SIZE}px. Tiles = ${TILE_WIDTH}×${TILE_HEIGHT}px (fixed size).`
          )
        ),
        React.createElement(
          'div',
          { className: 'mt-4 space-y-2' },
          React.createElement(
            'button',
            {
              onClick: () => {
                const maxX = Math.max(...data.characters.map((c) => c.gridX + 5), 0);
                const maxY = Math.max(...data.characters.map((c) => c.gridY + 8), 0);
                setData({
                  ...data,
                  canvasWidth: maxX + 10,
                  canvasHeight: maxY + 10
                });
              },
              className:
                'w-full bg-purple-600 hover:bg-purple-700 py-2 rounded text-sm font-semibold'
            },
            '✨ Auto-fit to Characters'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setData({ ...data, canvasWidth: 75, canvasHeight: 50 }),
              className: 'w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm'
            },
            'Medium (75×50)'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setData({ ...data, canvasWidth: 100, canvasHeight: 75 }),
              className: 'w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm'
            },
            'Large (100×75)'
          ),
          React.createElement(
            'button',
            {
              onClick: () => setData({ ...data, canvasWidth: 150, canvasHeight: 100 }),
              className: 'w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm'
            },
            'Extra Large (150×100)'
          )
        )
      ),

    // CHARACTERS
    activeTab === 'characters' &&
      React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          {
            className:
              'bg-blue-900 bg-opacity-30 border border-blue-700 p-2 rounded mb-3 text-xs'
          },
          '💡 Need more space? Go to the ',
          React.createElement(
            'span',
            {
              className: 'font-bold cursor-pointer underline',
              onClick: () => setActiveTab('canvas')
            },
            'Canvas tab'
          ),
          ' to expand the grid.'
        ),
        React.createElement(
          'button',
          {
            onClick: addCharacter,
            className:
              'bg-green-600 hover:bg-green-700 px-3 py-2 rounded mb-3 flex items-center gap-2 text-sm'
          },
          React.createElement(Plus, { size: 16 }),
          ' Add Character'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          data.characters.map((char) =>
            React.createElement(
              'div',
              {
                key: char.id,
                className: `p-3 rounded cursor-pointer ${
                  selectedCharacter?.id === char.id ? 'bg-blue-600' : 'bg-gray-800'
                } hover:bg-gray-700`,
                onClick: () => setSelectedCharacter(char)
              },
              React.createElement(
                'div',
                { className: 'flex justify-between items-start' },
                React.createElement(
                  'div',
                  { className: 'flex-1' },
                  React.createElement(
                    'div',
                    { className: 'font-semibold text-sm' },
                    char.name
                  ),
                  React.createElement(
                    'div',
                    { className: 'text-xs text-gray-400' },
                    `Grid: (${char.gridX}, ${char.gridY})`
                  )
                ),
                React.createElement(
                  'button',
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      deleteCharacter(char.id);
                    },
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 16 })
                )
              )
            )
          )
        ),
        selectedCharacter &&
          React.createElement(
            'div',
            { className: 'mt-4 p-3 bg-gray-800 rounded' },
            React.createElement(
              'h3',
              { className: 'font-semibold mb-3 text-sm' },
              'Edit Character'
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Name:',
              React.createElement('input', {
                type: 'text',
                value: selectedCharacter.name,
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, { name: e.target.value }),
                onClick: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
              })
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Pronunciation:',
              React.createElement('input', {
                type: 'text',
                value: selectedCharacter.pronunciation || '',
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, {
                    pronunciation: e.target.value
                  }),
                onClick: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
              })
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Titles (comma-separated):',
              React.createElement('input', {
                type: 'text',
                value: selectedCharacter.titles?.join(', ') || '',
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, {
                    titles: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                  }),
                onClick: (e) => e.stopPropagation(),
                onKeyDown: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
              })
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Nicknames (comma-separated):',
              React.createElement('input', {
                type: 'text',
                value: selectedCharacter.nicknames?.join(', ') || '',
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, {
                    nicknames: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                  }),
                onClick: (e) => e.stopPropagation(),
                onKeyDown: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
              })
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Bio:',
              React.createElement('textarea', {
                value: selectedCharacter.bio || '',
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, { bio: e.target.value }),
                onClick: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
                rows: 3
              })
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Sect/Faction:',
              React.createElement(
                'select',
                {
                  value: selectedCharacter.sect || '',
                  onChange: (e) =>
                    updateCharacter(selectedCharacter.id, { sect: e.target.value }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
                },
                React.createElement('option', { value: '' }, 'None'),
                Object.entries(data.legend.sects || {}).map(([key, sect]) =>
                  React.createElement('option', { key, value: key }, sect.name)
                )
              )
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Symbols:',
              React.createElement(
                'div',
                { className: 'mt-1 p-2 bg-gray-700 rounded max-h-32 overflow-y-auto' },
                Object.entries(data.legend.symbols || {}).length === 0
                  ? React.createElement(
                      'div',
                      { className: 'text-gray-400 text-xs' },
                      'No symbols defined in Legend'
                    )
                  : Object.entries(data.legend.symbols || {}).map(
                      ([emoji, meaning]) => {
                        const isChecked = selectedCharacter.symbols?.includes(emoji);
                        return React.createElement(
                          'label',
                          {
                            key: emoji,
                            className:
                              'flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-600 px-1 rounded',
                            onClick: (e) => e.stopPropagation()
                          },
                          React.createElement('input', {
                            type: 'checkbox',
                            checked: isChecked,
                            onChange: (e) => {
                              const currentSymbols = selectedCharacter.symbols || [];
                              const newSymbols = e.target.checked
                                ? [...currentSymbols, emoji]
                                : currentSymbols.filter((s) => s !== emoji);
                              updateCharacter(selectedCharacter.id, {
                                symbols: newSymbols
                              });
                            },
                            onClick: (e) => e.stopPropagation(),
                            className: 'cursor-pointer'
                          }),
                          React.createElement('span', { className: 'text-lg' }, emoji),
                          React.createElement(
                            'span',
                            { className: 'text-xs flex-1' },
                            meaning
                          )
                        );
                      }
                    )
              )
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Status Symbol:',
              React.createElement(
                'select',
                {
                  value: selectedCharacter.statusSymbol || '',
                  onChange: (e) =>
                    updateCharacter(selectedCharacter.id, {
                      statusSymbol: e.target.value
                    }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm'
                },
                React.createElement('option', { value: '' }, 'None'),
                Object.entries(data.legend.statusSymbols || {}).map(
                  ([emoji, meaning]) =>
                    React.createElement(
                      'option',
                      { key: emoji, value: emoji },
                      `${emoji} ${meaning}`
                    )
                )
              )
            ),
            React.createElement(
              'label',
              { className: 'block mb-2 text-xs' },
              'Image URL:',
              React.createElement('input', {
                type: 'text',
                value: selectedCharacter.image || '',
                onChange: (e) =>
                  updateCharacter(selectedCharacter.id, { image: e.target.value }),
                onClick: (e) => e.stopPropagation(),
                className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
                placeholder: 'https://...'
              })
            ),
            selectedCharacter.image &&
              React.createElement(
                'div',
                { className: 'mb-2' },
                React.createElement(
                  'label',
                  { className: 'block text-xs mb-1' },
                  'Image Position (crop):'
                ),
                React.createElement(
                  'div',
                  { className: 'grid grid-cols-3 gap-1' },
                  [
                    ['top-left', '↖'],
                    ['top', '↑'],
                    ['top-right', '↗'],
                    [null, ''], // spacer
                    ['center', '●'],
                    [null, ''], // spacer
                    ['bottom-left', '↙'],
                    ['bottom', '↓'],
                    ['bottom-right', '↘']
                  ].map(([pos, arrow], idx) => {
                    if (!pos) return React.createElement('div', { key: `spacer-${idx}` }); // Empty spacer

                    return React.createElement(
                      'button',
                      {
                        key: pos,
                        onClick: (e) => {
                          e.stopPropagation();
                          updateCharacter(selectedCharacter.id, { imagePosition: pos });
                        },
                        className: `p-2 rounded text-xl ${
                          (selectedCharacter.imagePosition || 'center') === pos
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`,
                        title: pos
                          .split('-')
                          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                          .join(' ')
                      },
                      arrow
                    );
                  })
                ),
                React.createElement(
                  'div',
                  { className: 'text-xs text-gray-400 mt-1' },
                  '💡 Adjust how the image is cropped within the tile'
                )
              ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-2 mt-2' },
              React.createElement(
                'label',
                { className: 'block text-xs' },
                'Grid X:',
                React.createElement('input', {
                  type: 'number',
                  value: selectedCharacter.gridX,
                  onChange: (e) =>
                    updateCharacter(selectedCharacter.id, {
                      gridX: Math.max(
                        0,
                        Math.min(data.canvasWidth - 1, parseInt(e.target.value) || 0)
                      )
                    }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
                  min: 0,
                  max: data.canvasWidth - 1
                }),
                selectedCharacter.gridX >= data.canvasWidth &&
                  React.createElement(
                    'div',
                    { className: 'text-red-400 text-xs mt-1' },
                    '⚠️ Outside canvas!'
                  )
              ),
              React.createElement(
                'label',
                { className: 'block text-xs' },
                'Grid Y:',
                React.createElement('input', {
                  type: 'number',
                  value: selectedCharacter.gridY,
                  onChange: (e) =>
                    updateCharacter(selectedCharacter.id, {
                      gridY: Math.max(
                        0,
                        Math.min(data.canvasHeight - 1, parseInt(e.target.value) || 0)
                      )
                    }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-full mt-1 p-2 bg-gray-700 rounded text-sm',
                  min: 0,
                  max: data.canvasHeight - 1
                }),
                selectedCharacter.gridY >= data.canvasHeight &&
                  React.createElement(
                    'div',
                    { className: 'text-red-400 text-xs mt-1' },
                    '⚠️ Outside canvas!'
                  )
              )
            )
          )
      ),

    // CONNECTIONS
    activeTab === 'connections' &&
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            onClick: addConnection,
            className:
              'bg-green-600 hover:bg-green-700 px-3 py-2 rounded mb-3 flex items-center gap-2 text-sm'
          },
          React.createElement(Plus, { size: 16 }),
          ' Add Connection'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          data.connections.map((conn) => {
            const fromChar = data.characters.find((c) => c.id === conn.from);
            const toChar = data.characters.find((c) => c.id === conn.to);
            const ensureLabels = (c) => c.labels || [];
            return React.createElement(
              'div',
              {
                key: conn.id,
                className: `p-3 rounded cursor-pointer ${
                  selectedConnection === conn.id ? 'bg-blue-600' : 'bg-gray-800'
                } hover:bg-gray-700`,
                onClick: () => setSelectedConnection(conn.id)
              },
              React.createElement(
                'div',
                { className: 'flex justify-between items-start mb-2' },
                React.createElement(
                  'div',
                  { className: 'text-xs' },
                  `${fromChar?.name || 'Unknown'} → ${toChar?.name || 'Unknown'}`
                ),
                React.createElement(
                  'button',
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      deleteConnection(conn.id);
                    },
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 16 })
                )
              ),
              React.createElement(
                'div',
                { className: 'grid grid-cols-2 gap-2' },
                React.createElement(
                  'label',
                  { className: 'block text-xs' },
                  'From:',
                  React.createElement(
                    'select',
                    {
                      value: conn.from,
                      onChange: (e) => updateConnection(conn.id, { from: e.target.value }),
                      className: 'w-full mt-1 p-1 bg-gray-700 rounded text-xs',
                      onClick: (e) => e.stopPropagation()
                    },
                    data.characters.map((c) =>
                      React.createElement('option', { key: c.id, value: c.id }, c.name)
                    )
                  )
                ),
                React.createElement(
                  'label',
                  { className: 'block text-xs' },
                  'To:',
                  React.createElement(
                    'select',
                    {
                      value: conn.to,
                      onChange: (e) => updateConnection(conn.id, { to: e.target.value }),
                      className: 'w-full mt-1 p-1 bg-gray-700 rounded text-xs',
                      onClick: (e) => e.stopPropagation()
                    },
                    data.characters.map((c) =>
                      React.createElement('option', { key: c.id, value: c.id }, c.name)
                    )
                  )
                )
              ),
              React.createElement(
                'label',
                { className: 'block mt-2 text-xs' },
                'Type:',
                React.createElement(
                  'select',
                  {
                    value: conn.type,
                    onChange: (e) => updateConnection(conn.id, { type: e.target.value }),
                    className: 'w-full mt-1 p-1 bg-gray-700 rounded text-xs',
                    onClick: (e) => e.stopPropagation()
                  },
                  Object.entries(data.legend.lines).map(([key, val]) =>
                    React.createElement('option', { key, value: key }, val.label)
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'grid grid-cols-2 gap-2 mt-2' },
                React.createElement(
                  'label',
                  { className: 'block text-xs' },
                  'Start Side:',
                  React.createElement(
                    'select',
                    {
                      value: conn.startSide,
                      onChange: (e) =>
                        updateConnection(conn.id, { startSide: e.target.value }),
                      className: 'w-full mt-1 p-1 bg-gray-700 rounded text-xs',
                      onClick: (e) => e.stopPropagation()
                    },
                    ['top', 'bottom', 'left', 'right'].map((side) =>
                      React.createElement(
                        'option',
                        { key: side, value: side },
                        side.charAt(0).toUpperCase() + side.slice(1)
                      )
                    )
                  )
                ),
                React.createElement(
                  'label',
                  { className: 'block text-xs' },
                  'End Side:',
                  React.createElement(
                    'select',
                    {
                      value: conn.endSide,
                      onChange: (e) =>
                        updateConnection(conn.id, { endSide: e.target.value }),
                      className: 'w-full mt-1 p-1 bg-gray-700 rounded text-xs',
                      onClick: (e) => e.stopPropagation()
                    },
                    ['top', 'bottom', 'left', 'right'].map((side) =>
                      React.createElement(
                        'option',
                        { key: side, value: side },
                        side.charAt(0).toUpperCase() + side.slice(1)
                      )
                    )
                  )
                )
              ),

              // ----- Line Labels management -----
              selectedConnection === conn.id &&
                React.createElement(
                  'div',
                  { className: 'mt-3 p-2 bg-gray-800 rounded' },
                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-between mb-2' },
                    React.createElement(
                      'h4',
                      { className: 'font-semibold text-sm' },
                      'Line Labels'
                    ),
                    React.createElement(
                      'button',
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          const newLabel = {
                            id: 'lbl_' + Date.now().toString(36),
                            segmentIndex: 0,
                            t: 0.5,
                            side: 'auto'
                          };
                          updateConnection(conn.id, {
                            labels: [...ensureLabels(conn), newLabel]
                          });
                        },
                        className:
                          'bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded flex items-center gap-1'
                      },
                      React.createElement(Plus, { size: 12 }),
                      'Add Label'
                    )
                  ),
                  (ensureLabels(conn).length === 0
                    ? React.createElement(
                        'div',
                        { className: 'text-xs text-gray-300 mb-2' },
                        'No custom labels yet. Click “Add Label” to create one. (Two default labels still render on the canvas until you customize.)'
                      )
                    : null),
                  ensureLabels(conn).map((lbl) =>
                    React.createElement(
                      'div',
                      {
                        key: lbl.id,
                        className:
                          'flex items-center justify-between gap-2 mb-2 bg-gray-900 px-2 py-2 rounded'
                      },
                      React.createElement(
                        'div',
                        { className: 'text-xs flex-1' },
                        `${fromChar?.name || 'Unknown'} → ${toChar?.name || 'Unknown'}`
                      ),
                      React.createElement(
                        'label',
                        { className: 'text-xs flex items-center gap-1' },
                        'Side:',
                        React.createElement(
                          'select',
                          {
                            value: lbl.side || 'auto',
                            onChange: (e) => {
                              const updated = ensureLabels(conn).map((l) =>
                                l.id === lbl.id ? { ...l, side: e.target.value } : l
                              );
                              updateConnection(conn.id, { labels: updated });
                            },
                            className: 'bg-gray-700 rounded px-1 py-0.5 text-xs'
                          },
                          sideOptions.map(([val, label]) =>
                            React.createElement('option', { key: val, value: val }, label)
                          )
                        )
                      ),
                      React.createElement(
                        'button',
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            const updated = ensureLabels(conn).filter(
                              (l) => l.id !== lbl.id
                            );
                            updateConnection(conn.id, { labels: updated });
                          },
                          className:
                            'text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded'
                        },
                        'Delete'
                      )
                    )
                  ),
                  selectedConnection === conn.id &&
                    React.createElement(
                      'div',
                      { className: 'mt-2 text-xs text-gray-400' },
                      '💡 Drag labels on the canvas to reposition along the line. The “Side” controls where the label sits relative to the line or screen.'
                    )
                ),

              selectedConnection === conn.id &&
                React.createElement(
                  'div',
                  { className: 'mt-2 text-xs text-gray-300' },
                  '💡 Click green dots on the canvas to add waypoints to bend this line'
                )
            );
          })
        )
      ),

    // LEGEND
    activeTab === 'legend' &&
      React.createElement(
        'div',
        null,
        React.createElement(
          'h3',
          { className: 'font-semibold mb-2 text-sm' },
          'Line Styles'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2 mb-4' },
          Object.entries(data.legend.lines).map(([key, style]) =>
            React.createElement(
              'div',
              { key, className: 'p-3 bg-gray-800 rounded' },
              React.createElement(
                'div',
                { className: 'flex justify-between items-start mb-2' },
                React.createElement('input', {
                  type: 'text',
                  value: style.label,
                  onChange: (e) =>
                    updateLegend('lines', key, { label: e.target.value }),
                  className: 'bg-gray-700 px-2 py-1 rounded text-xs flex-1 mr-2'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: () => updateLegend('lines', key, null),
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 14 })
                )
              ),
              React.createElement(
                'div',
                { className: 'grid grid-cols-3 gap-2 text-xs' },
                React.createElement(
                  'label',
                  { className: 'block' },
                  'Color:',
                  React.createElement('input', {
                    type: 'color',
                    value: style.color,
                    onChange: (e) =>
                      updateLegend('lines', key, { color: e.target.value }),
                    className: 'w-full mt-1 h-8 bg-gray-700 rounded'
                  })
                ),
                React.createElement(
                  'label',
                  { className: 'block' },
                  'Style:',
                  React.createElement(
                    'select',
                    {
                      value: style.style,
                      onChange: (e) =>
                        updateLegend('lines', key, { style: e.target.value }),
                      className: 'w-full mt-1 p-1 bg-gray-700 rounded'
                    },
                    React.createElement('option', { value: 'solid' }, 'Solid'),
                    React.createElement('option', { value: 'dashed' }, 'Dashed'),
                    React.createElement('option', { value: 'dotted' }, 'Dotted')
                  )
                ),
                React.createElement(
                  'label',
                  { className: 'block' },
                  'Width:',
                  React.createElement('input', {
                    type: 'number',
                    value: style.thickness,
                    onChange: (e) =>
                      updateLegend('lines', key, {
                        thickness: parseInt(e.target.value) || 1
                      }),
                    className: 'w-full mt-1 p-1 bg-gray-700 rounded',
                    min: 1,
                    max: 10
                  })
                )
              )
            )
          ),
          // Add Line Type button
          React.createElement(
            'button',
            {
              onClick: () => {
                const newId = `line_${Date.now()}`;
                updateLegend('lines', newId, {
                  color: '#22d3ee',
                  style: 'solid',
                  thickness: 2,
                  label: 'New Line'
                });
              },
              className:
                'w-full mt-2 bg-green-600 hover:bg-green-700 py-2 rounded text-sm flex items-center justify-center gap-2'
            },
            React.createElement(Plus, { size: 16 }),
            ' Add Line Type'
          )
        ),
        React.createElement(
          'h3',
          { className: 'font-semibold mb-2 mt-4 text-sm' },
          'Trait Symbols'
        ),
        React.createElement(
          'p',
          { className: 'text-xs text-gray-400 mb-2' },
          'Character attributes and abilities'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          Object.entries(data.legend.symbols || {}).map(([symbol, meaning]) =>
            React.createElement(
              'div',
              { key: symbol, className: 'p-2 bg-gray-800 rounded' },
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 mb-1' },
                React.createElement('input', {
                  type: 'text',
                  value: symbol,
                  onChange: (e) => {
                    const newSymbol = e.target.value;
                    if (newSymbol && newSymbol !== symbol) {
                      const newSymbols = { ...data.legend.symbols };
                      delete newSymbols[symbol];
                      newSymbols[newSymbol] = meaning;
                      setData({
                        ...data,
                        legend: { ...data.legend, symbols: newSymbols }
                      });
                    }
                  },
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-12 bg-gray-700 px-2 py-1 rounded text-sm text-center',
                  placeholder: '😀',
                  maxLength: 2
                }),
                React.createElement('input', {
                  type: 'text',
                  value: meaning,
                  onChange: (e) => updateLegend('symbols', symbol, e.target.value),
                  onClick: (e) => e.stopPropagation(),
                  className: 'flex-1 bg-gray-700 px-2 py-1 rounded text-xs',
                  placeholder: 'Meaning'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: () => updateLegend('symbols', symbol, null),
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 12 })
                )
              )
            )
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => {
              const newSymbols = { ...data.legend.symbols, '❓': 'New Symbol' };
              setData({ ...data, legend: { ...data.legend, symbols: newSymbols } });
            },
            className:
              'w-full mt-2 bg-green-600 hover:bg-green-700 py-1.5 rounded text-xs flex items-center justify-center gap-1'
          },
          React.createElement(Plus, { size: 14 }),
          ' Add Trait Symbol'
        ),
        React.createElement(
          'h3',
          { className: 'font-semibold mb-2 mt-4 text-sm' },
          'Status Symbols'
        ),
        React.createElement(
          'p',
          { className: 'text-xs text-gray-400 mb-2' },
          'Life status, conditions, states'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          Object.entries(data.legend.statusSymbols || {}).map(([symbol, meaning]) =>
            React.createElement(
              'div',
              { key: symbol, className: 'p-2 bg-gray-800 rounded' },
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 mb-1' },
                React.createElement('input', {
                  type: 'text',
                  value: symbol,
                  onChange: (e) => {
                    const newSymbol = e.target.value;
                    if (newSymbol && newSymbol !== symbol) {
                      const newStatusSymbols = { ...data.legend.statusSymbols };
                      delete newStatusSymbols[symbol];
                      newStatusSymbols[newSymbol] = meaning;
                      setData({
                        ...data,
                        legend: { ...data.legend, statusSymbols: newStatusSymbols }
                      });
                    }
                  },
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-12 bg-gray-700 px-2 py-1 rounded text-sm text-center',
                  placeholder: '💀',
                  maxLength: 2
                }),
                React.createElement('input', {
                  type: 'text',
                  value: meaning,
                  onChange: (e) => updateLegend('statusSymbols', symbol, e.target.value),
                  onClick: (e) => e.stopPropagation(),
                  className: 'flex-1 bg-gray-700 px-2 py-1 rounded text-xs',
                  placeholder: 'Meaning'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: () => updateLegend('statusSymbols', symbol, null),
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 12 })
                )
              )
            )
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => {
              const newStatusSymbols = {
                ...data.legend.statusSymbols,
                '❓': 'New Status'
              };
              setData({
                ...data,
                legend: { ...data.legend, statusSymbols: newStatusSymbols }
              });
            },
            className:
              'w-full mt-2 bg-green-600 hover:bg-green-700 py-1.5 rounded text-xs flex items-center justify-center gap-1'
          },
          React.createElement(Plus, { size: 14 }),
          ' Add Status Symbol'
        ),
        React.createElement(
          'h3',
          { className: 'font-semibold mb-2 mt-4 text-sm' },
          'Sects/Factions'
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          Object.entries(data.legend.sects || {}).map(([key, sect]) =>
            React.createElement(
              'div',
              { key, className: 'p-2 bg-gray-800 rounded' },
              React.createElement(
                'div',
                { className: 'flex items-center gap-2 mb-2' },
                React.createElement('input', {
                  type: 'text',
                  value: sect.name,
                  onChange: (e) =>
                    updateLegend('sects', key, { ...sect, name: e.target.value }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'flex-1 bg-gray-700 px-2 py-1 rounded text-xs',
                  placeholder: 'Sect name'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: () => updateLegend('sects', key, null),
                    className: 'text-red-400 hover:text-red-300'
                  },
                  React.createElement(Trash2, { size: 12 })
                )
              ),
              React.createElement(
                'label',
                { className: 'block text-xs' },
                'Name bar color:',
                React.createElement('input', {
                  type: 'color',
                  value: sect.color,
                  onChange: (e) =>
                    updateLegend('sects', key, { ...sect, color: e.target.value }),
                  onClick: (e) => e.stopPropagation(),
                  className: 'w-full mt-1 h-8 bg-gray-700 rounded'
                })
              )
            )
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => {
              const newId = `sect_${Date.now()}`;
              updateLegend('sects', newId, { name: 'New Sect', color: '#6366f1' });
            },
            className:
              'w-full mt-2 bg-green-600 hover:bg-green-700 py-2 rounded text-sm flex items-center justify-center gap-2'
          },
          React.createElement(Plus, { size: 16 }),
          ' Add Sect'
        )
      ),

    publishSection,
    // EXPORT / IMPORT
    React.createElement(
      'div',
      { className: 'mt-4 p-3 bg-gray-800 rounded space-y-2' },
      React.createElement(
        'button',
        {
          onClick: exportData,
          className:
            'w-full bg-blue-600 hover:bg-blue-700 py-2 rounded flex items-center justify-center gap-2 text-sm'
        },
        React.createElement(Save, { size: 16 }),
        ' Export Data'
      ),
      React.createElement(
        'label',
        {
          className:
            'w-full bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2 cursor-pointer text-sm'
        },
        React.createElement(Upload, { size: 16 }),
        ' Import Data',
        React.createElement('input', {
          type: 'file',
          accept: '.json',
          className: 'hidden',
          onChange: (e) => importData(e.target.files[0])
        })
      )
    )
  );
}

function CharacterMapper() {
  // Initialize data with defaults for canvas size if missing
  const [data, setData] = useState(() => {
    const d = { ...initialData };
    if (!d.canvasWidth) d.canvasWidth = 50;
    if (!d.canvasHeight) d.canvasHeight = 40;
    if (!d.legend.sects) d.legend.sects = {};
    if (!d.legend.statusSymbols) d.legend.statusSymbols = {};
    return d;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [modalCharacter, setModalCharacter] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [legendMinimized, setLegendMinimized] = useState(false);
  const [draggingWaypoint, setDraggingWaypoint] = useState(null);
  const [draggingLabel, setDraggingLabel] = useState(null); // { connId, labelId }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas');
  const canvasRef = useRef(null);

  // --- Multi-select state ---
const [selectedIds, setSelectedIds] = useState(new Set()); // Set<string>
const lastSelectedId = useRef(null);
const setOnlySelected = (id) => {
  lastSelectedId.current = id;
  setSelectedIds(new Set([id]));
};
const toggleSelected = (id) =>
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
const isSelected = (id) => selectedIds.has(id);

// --- Global key handlers (Select All / Clear) ---
useEffect(() => {
  const onKeyDown = (e) => {
    // Cmd/Ctrl+A => select all tiles
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelectedIds(new Set(data.characters.map(c => c.id)));
    }
    // Escape => clear selection
    if (e.key === 'Escape') setSelectedIds(new Set());
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [data.characters]);

// --- Window-driven drag for group move ---
const dragAnchorId = useRef(null);
const lastDragPos = useRef({ x: 0, y: 0 });

const applyDelta = (dx, dy, anchorId) => {
  // convert px deltas to grid steps; keep your snap behavior consistent
  const stepX = Math.round(dx / GRID_SIZE);
  const stepY = Math.round(dy / GRID_SIZE);
  if (!stepX && !stepY) return;

  setData(prev => {
    const group = (selectedIds.size && selectedIds.has(anchorId))
      ? selectedIds
      : new Set([anchorId]);
    return {
      ...prev,
      characters: prev.characters.map(c =>
        group.has(c.id)
          ? { ...c, gridX: Math.max(0, c.gridX + stepX), gridY: Math.max(0, c.gridY + stepY) }
          : c
      )
    };
  });
};

const startWindowDrag = (clientX, clientY, anchorId) => {
  dragAnchorId.current = anchorId;
  lastDragPos.current = { x: clientX, y: clientY };

  const onMove = (e) => {
    if (!dragAnchorId.current) return;
    const dx = e.clientX - lastDragPos.current.x;
    const dy = e.clientY - lastDragPos.current.y;
    if (dx || dy) {
      applyDelta(dx, dy, dragAnchorId.current);
      lastDragPos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onUp = () => {
    dragAnchorId.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};

  // ---- GitHub publish config (editor-only) ----
const [publishCfg, setPublishCfg] = useState(() => {
    try {
      const raw = localStorage.getItem('ghPublishConfig');
      return raw ? JSON.parse(raw) : { owner: '', repo: '', branch: 'main', path: 'data.json', token: '' };
    } catch {
      return { owner: '', repo: '', branch: 'main', path: 'data.json', token: '' };
    }
  });
  const savePublishCfg = (cfg) => {
    setPublishCfg(cfg);
    try { localStorage.setItem('ghPublishConfig', JSON.stringify(cfg)); } catch {}
  };
  
  // Helper to base64-encode UTF-8 safely
  const b64encodeUTF8 = (str) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      const enc = new TextEncoder();
      const bytes = enc.encode(str);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary);
    }
  };
  
  // Load data.json from the site (shared for all viewers)
  const loadFromRemoteJson = async () => {
    try {
      const resp = await fetch(`data.json?v=${Date.now()}`, { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        setData(normalizeData(json));
        console.log('[v4] Loaded data.json from server');
      } else {
        console.log('[v4] data.json not found or not ok:', resp.status);
      }
    } catch (e) {
      console.warn('[v4] Failed to fetch data.json', e);
    }
  };
  
  // Publish current data to GitHub (updates data.json on your repo)
  const publishToGitHub = async (message = 'Update data.json from app') => {
    const { owner, repo, branch, path, token } = publishCfg || {};
    if (!owner || !repo || !path || !token) {
      alert('Set Owner, Repo, Path, and Token in Publish settings first.');
      return;
    }
    const apiBase = 'https://api.github.com';
    const contentUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`
    };
  
    // Get current file SHA (for update) if it exists
    let sha = undefined;
    try {
      const getResp = await fetch(`${contentUrl}?ref=${encodeURIComponent(branch || 'main')}`, { headers });
      if (getResp.status === 200) {
        const meta = await getResp.json();
        sha = meta.sha;
      } else if (getResp.status !== 404) {
        const t = await getResp.text();
        throw new Error(`GET failed: ${getResp.status} ${t}`);
      }
    } catch (e) {
      console.warn('Could not retrieve existing file metadata:', e);
    }
  
    const body = {
      message: message || 'Update data.json from app',
      content: b64encodeUTF8(JSON.stringify(data, null, 2)),
      branch: branch || 'main'
    };
    if (sha) body.sha = sha;
  
    try {
      const putResp = await fetch(contentUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      if (!putResp.ok) {
        const t = await putResp.text();
        throw new Error(`PUT failed: ${putResp.status} ${t}`);
      }
      console.log('[v4] Published to GitHub successfully.');
      alert('Published to GitHub. It may take up to a minute for GitHub Pages to reflect the change.');
    } catch (e) {
      console.error('Publish failed:', e);
      alert('Publish failed. Check the console for details.');
    }
  };

  // ---- Persistence (v3): Autosave to localStorage and restore on load ----
const STORAGE_KEY = 'character-map-builder.v3';

const normalizeData = (d) => {
  const cloned = { ...d };
  if (!cloned.canvasWidth) cloned.canvasWidth = 50;
  if (!cloned.canvasHeight) cloned.canvasHeight = 40;
  if (!cloned.legend) cloned.legend = { alignments: {}, relationships: {}, sects: {}, statusSymbols: {} };
  if (!cloned.legend.sects) cloned.legend.sects = {};
  if (!cloned.legend.statusSymbols) cloned.legend.statusSymbols = {};
  if (!Array.isArray(cloned.characters)) cloned.characters = [];
  if (!Array.isArray(cloned.connections)) cloned.connections = [];
  cloned.characters = cloned.characters.map((c) => ({
    imagePosition: 'center',
    ...c,
    imagePosition: c.imagePosition || 'center'
  }));
  return cloned;
};

const saveToStorage = (payload = data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    console.log('[v3] Saved to localStorage');
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
};

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setData(normalizeData(parsed));
      console.log('[v3] Loaded saved data from localStorage');
    }
  } catch (e) {
    console.warn('Failed to load from localStorage', e);
  }
};

// Load once on mount
useEffect(() => {
    const hasLocal = !!localStorage.getItem(STORAGE_KEY);
    loadFromStorage();
    if (!hasLocal) {
      // If the viewer has no local draft, load shared data.json
      loadFromRemoteJson();
    }
  }, []);

// When leaving edit mode, persist immediately
useEffect(() => {
  if (!isEditing) saveToStorage(data);
}, [isEditing]);

// Safety: also save on unload
useEffect(() => {
  const handleBeforeUnload = () => saveToStorage(data);
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [data]);

// Optional manual helpers for the console:
const manualSave = () => saveToStorage(data);
window.cmSave = manualSave;
window.cmClear = () => localStorage.removeItem(STORAGE_KEY);

  const handleDragStart = (e, character) => {
    if (!isEditing) return;
    e.dataTransfer.setData('characterId', character.id);
  };

  const handleDrop = (e) => {
    if (!isEditing) return;
    e.preventDefault();
    const characterId = e.dataTransfer.getData('characterId');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridX = Math.round(x / GRID_SIZE);
    const gridY = Math.round(y / GRID_SIZE);

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(gridX, canvasWidth - 1));
    const clampedY = Math.max(0, Math.min(gridY, canvasHeight - 1));

    setData({
      ...data,
      characters: data.characters.map((c) =>
        c.id === characterId ? { ...c, gridX: clampedX, gridY: clampedY } : c
      )
    });
  };

  const handleDragOver = (e) => {
    if (isEditing) e.preventDefault();
  };

  const handleWaypointDrag = (connId, wpIndex, e) => {
    e.preventDefault();
    setDraggingWaypoint({ connId, wpIndex });
  };

  // --- Connection geometry helpers (shared by label drag and migration) ---
  const getConnectionPointForChar = (char, side) => {
    const baseX = char.gridX * GRID_SIZE + TILE_WIDTH / 2;
    const baseY = char.gridY * GRID_SIZE + TILE_HEIGHT / 2;
    switch (side) {
      case 'top':
        return { x: baseX, y: char.gridY * GRID_SIZE };
      case 'bottom':
        return { x: baseX, y: char.gridY * GRID_SIZE + TILE_HEIGHT };
      case 'left':
        return { x: char.gridX * GRID_SIZE, y: baseY };
      case 'right':
        return { x: char.gridX * GRID_SIZE + TILE_WIDTH, y: baseY };
      default:
        return { x: baseX, y: baseY };
    }
  };

  const computeAllPointsForConnection = (conn, _data = data) => {
    const fromChar = _data.characters.find((c) => c.id === conn.from);
    const toChar = _data.characters.find((c) => c.id === conn.to);
    if (!fromChar || !toChar) return [];
    const start = getConnectionPointForChar(fromChar, conn.startSide || 'right');
    const end = getConnectionPointForChar(toChar, conn.endSide || 'left');
    return [start, ...(conn.waypoints || []), end];
  };

  const projectPointToSegment = (px, py, ax, ay, bx, by) => {
    const abx = bx - ax,
      aby = by - ay;
    const apx = px - ax,
      apy = py - ay;
    const ab2 = abx * abx + aby * aby || 1;
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    const dx = px - cx,
      dy = py - cy;
    const dist2 = dx * dx + dy * dy;
    return { t, cx, cy, dist2 };
  };

  // Ensure a connection has labels (migrate defaults) – used on selection & on label drag start
  const ensureConnectionLabels = (connId, seedIds = ['start', 'end']) => {
    const conn = data.connections.find((c) => c.id === connId);
    if (!conn) return;
    if (conn.labels && conn.labels.length) return;

    const pts = computeAllPointsForConnection(conn);
    const lastSeg = Math.max(0, pts.length - 2);
    const defaults = [
      { id: seedIds[0] || 'start', segmentIndex: 0, t: 0.1, side: 'auto' },
      { id: seedIds[1] || 'end', segmentIndex: lastSeg, t: 0.9, side: 'auto' }
    ];
    setData({
      ...data,
      connections: data.connections.map((c) =>
        c.id === connId ? { ...c, labels: defaults } : c
      )
    });
  };

  const handleLabelDragStart = (connId, labelId, e) => {
    if (!isEditing) return;
    e.preventDefault();
    // Migrate defaults into state if missing; preserve the same ids so drag can target them
    ensureConnectionLabels(connId, ['start', 'end']);
    setDraggingLabel({ connId, labelId });
  };

  const handleMouseMove = (e) => {
    if (!isEditing) return;

    if (draggingWaypoint) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setData({
        ...data,
        connections: data.connections.map((conn) => {
          if (conn.id === draggingWaypoint.connId) {
            const newWaypoints = [...(conn.waypoints || [])];
            newWaypoints[draggingWaypoint.wpIndex] = { x, y };
            return { ...conn, waypoints: newWaypoints };
          }
          return conn;
        })
      });
      return;
    }

    if (draggingLabel) {
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      setData({
        ...data,
        connections: data.connections.map((conn) => {
          if (conn.id !== draggingLabel.connId) return conn;
          const pts = computeAllPointsForConnection(conn);
          if (pts.length < 2) return conn;

          let best = { segmentIndex: 0, t: 0.5, dist2: Infinity };
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i],
              p1 = pts[i + 1];
            const proj = projectPointToSegment(px, py, p0.x, p0.y, p1.x, p1.y);
            if (proj.dist2 < best.dist2)
              best = { segmentIndex: i, t: proj.t, dist2: proj.dist2 };
          }

          // Ensure labels array exists
          const labels = (conn.labels && [...conn.labels]) || [
            { id: 'start', segmentIndex: 0, t: 0.1, side: 'auto' },
            { id: 'end', segmentIndex: Math.max(0, pts.length - 2), t: 0.9, side: 'auto' }
          ];
          const updated = labels.map((l) =>
            l.id === draggingLabel.labelId
              ? { ...l, segmentIndex: best.segmentIndex, t: best.t }
              : l
          );
          return { ...conn, labels: updated };
        })
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingWaypoint(null);
    setDraggingLabel(null);
  };

  const handleAddWaypoint = (connId, segmentIndex, x, y) => {
    setData({
      ...data,
      connections: data.connections.map((conn) => {
        if (conn.id === connId) {
          const newWaypoints = [...(conn.waypoints || [])];
          newWaypoints.splice(segmentIndex, 0, { x, y });
          return { ...conn, waypoints: newWaypoints };
        }
        return conn;
      })
    });
  };

  const handleDeleteWaypoint = (connId, wpIndex) => {
    setData({
      ...data,
      connections: data.connections.map((conn) => {
        if (conn.id === connId) {
          const newWaypoints = (conn.waypoints || []).filter((_, i) => i !== wpIndex);
          return { ...conn, waypoints: newWaypoints };
        }
        return conn;
      })
    });
  };

  const handleEditClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      if (isEditing) {
        // leaving edit mode -> persist changes
        saveToStorage(data);
      }
      setIsEditing(!isEditing);
    }
  };

  const canvasWidth = data.canvasWidth || 10;
  const canvasHeight = data.canvasHeight || 8;

  // Search functionality
  const matchesSearch = (character) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    const searchFields = [
      character.name,
      character.pronunciation,
      character.bio,
      ...(character.titles || []),
      ...(character.nicknames || [])
    ]
      .filter(Boolean)
      .map((s) => s.toLowerCase());

    return searchFields.some((field) => field.includes(query));
  };

  const matchingCharacters = data.characters.filter(matchesSearch);
  const hasSearchResults = searchQuery.trim() !== '';
  const searchResultCount = matchingCharacters.length;

  // When selecting a connection in edit mode, make sure it has labels so the panel can manage them.
  useEffect(() => {
    if (!isEditing || !selectedConnection) return;
    const conn = data.connections.find((c) => c.id === selectedConnection);
    if (conn && (!conn.labels || conn.labels.length === 0)) {
      ensureConnectionLabels(conn.id);
    }
    // eslint-disable-next-line
  }, [selectedConnection, isEditing]);

  useEffect(() => {
    if (draggingWaypoint || draggingLabel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingWaypoint, draggingLabel, data]);

  return React.createElement(
    'div',
    { className: 'min-h-screen bg-gray-950 flex' },
    isEditing &&
      isAuthenticated &&
      React.createElement(
        'div',
        {
          className: 'w-80 border-r border-gray-700'
        },
        React.createElement(EditPanel, {
            data,
            setData,
            selectedCharacter,
            setSelectedCharacter,
            selectedConnection,
            setSelectedConnection,
            activeTab,
            setActiveTab,
            publishCfg,
            savePublishCfg,
            onPublish: publishToGitHub
          })
      ),
    React.createElement(
      'div',
      { className: 'flex-1 flex' },
      showLegend &&
        React.createElement(
          'div',
          {
            className: 'p-4 bg-gray-950'
          },
          React.createElement(Legend, {
            legend: data.legend,
            isMinimized: legendMinimized,
            onToggleMinimize: () => setLegendMinimized(!legendMinimized)
          })
        ),
      React.createElement(
        'div',
        { className: 'flex-1 relative' },
        React.createElement(
          'div',
          { className: 'absolute top-4 right-4 z-10 flex gap-2 items-center' },
          !isEditing &&
            (searchExpanded
              ? React.createElement(
                  'div',
                  {
                    className:
                      'flex items-center gap-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 px-3 py-2'
                  },
                  React.createElement('span', { className: 'text-white text-sm' }, '🔍'),
                  React.createElement('input', {
                    type: 'text',
                    value: searchQuery,
                    onChange: (e) => setSearchQuery(e.target.value),
                    placeholder: 'Search anything',
                    className:
                      'w-48 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    autoFocus: true
                  }),
                  searchQuery &&
                    React.createElement(
                      'button',
                      {
                        onClick: () => setSearchQuery(''),
                        className: 'text-gray-400 hover:text-white text-xs'
                      },
                      '✖️'
                    ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => {
                        setSearchExpanded(false);
                        setSearchQuery('');
                      },
                      className: 'text-gray-400 hover:text-white text-sm ml-1'
                    },
                    '◀'
                  )
                )
              : React.createElement(
                  'button',
                  {
                    onClick: () => setSearchExpanded(true),
                    className:
                      'bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm',
                    title: 'Search characters'
                  },
                  '🔍'
                )),
          React.createElement(
            'button',
            {
              onClick: () => setShowLegend(!showLegend),
              className:
                'bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm'
            },
            showLegend ? 'Hide' : 'Show',
            ' Legend'
          ),
          React.createElement(
            'button',
            {
              onClick: handleEditClick,
              className:
                'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm'
            },
            isEditing ? React.createElement(Eye, { size: 18 }) : React.createElement(Edit, { size: 18 }),
            isEditing ? ' View Mode' : ' Edit Mode'
          )
        ),
        React.createElement(
          'div',
          { className: 'overflow-auto h-screen p-8' },
          React.createElement(
            'div',
            {
              ref: canvasRef,
              className: 'relative bg-gray-900',
              style: {
                width: canvasWidth * GRID_SIZE,
                height: canvasHeight * GRID_SIZE,
                backgroundImage: isEditing
                  ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
                  : 'none',
                backgroundSize: isEditing ? `${GRID_SIZE}px ${GRID_SIZE}px` : 'auto'
              },
              onDrop: handleDrop,
              onDragOver: handleDragOver
            },
            React.createElement(
              'svg',
              {
                className: 'absolute inset-0 w-full h-full pointer-events-none'
              },
              React.createElement(
                'g',
                { className: 'pointer-events-auto' },
                data.connections.map((conn) =>
                  React.createElement(ConnectionLine, {
                    key: conn.id,
                    connection: conn,
                    characters: data.characters,
                    legend: data.legend,
                    isEditing,
                    onWaypointDrag: handleWaypointDrag,
                    onAddWaypoint: handleAddWaypoint,
                    onDeleteWaypoint: handleDeleteWaypoint,
                    selectedConnection,
                    onLabelDragStart: handleLabelDragStart,
                    onConnectionClick: (connId) => {
                      if (!isEditing) return;
                      const clicked = data.connections.find((c) => c.id === connId);
                      if (!clicked) return;
                      setSelectedCharacter(null);
                      setSelectedConnection(connId);
                      setActiveTab('connections');
                    }
                  })
                )
              )
            ),
            data.characters.map((char) => {
              const isMatch = matchesSearch(char);
              const sectColor =
                char.sect && data.legend.sects?.[char.sect]?.color;
              return React.createElement(CharacterTile, {
                key: char.id,
                character: char,
                onClick: () => {
                  if (!isEditing) {
                    setModalCharacter(char);
                    return;
                  }
                  // Edit Mode: open Characters tab with this selection
                  setSelectedConnection(null);
                  setSelectedCharacter(char);
                  setActiveTab('characters');
                },
                isEditing,
                onDragStart: (e) => handleDragStart(e, char),
                isHighlighted: hasSearchResults && isMatch,
                isDimmed: hasSearchResults && !isMatch,
                sectColor
              });
            })
          )
        )
      )
    ),
    modalCharacter &&
      React.createElement(CharacterModal, {
        character: modalCharacter,
        legend: data.legend,
        onClose: () => setModalCharacter(null),
        connections: data.connections,
        allCharacters: data.characters
      }),
    showAuthModal &&
      React.createElement(AuthModal, {
        onAuthenticate: () => {
          setIsAuthenticated(true);
          setIsEditing(true);
        },
        onClose: () => setShowAuthModal(false)
      })
  );
}

// Initialize the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(CharacterMapper));