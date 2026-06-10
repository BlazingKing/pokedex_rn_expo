import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const STAT_LABELS = ['HP', 'ATK', 'DEF', 'SP.ATK', 'SP.DEF', 'SPD'];

const MAX_VAL = 255;
const RADIUS = 100;
const CX = 110;
const CY = 110;
const NUM_SIDES = 6;

function getVertex(i: number, r: number): { x: number; y: number } {
  const angle = (Math.PI / 180) * (-90 + i * 60);
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  };
}

function hexagonPoints(r: number): string {
  return Array.from({ length: NUM_SIDES }, (_, i) => {
    const v = getVertex(i, r);
    return `${v.x},${v.y}`;
  }).join(' ');
}

function statsToPoints(stats: Array<{ name: string; value: number }>): string {
  return STAT_ORDER.map((statName, i) => {
    const found = stats.find((s) => s.name === statName);
    const value = found ? found.value : 0;
    const r = (value / MAX_VAL) * RADIUS;
    const v = getVertex(i, r);
    return `${v.x},${v.y}`;
  }).join(' ');
}

interface Props {
  stats: Array<{ name: string; value: number }>;
  color?: string;
  secondStats?: Array<{ name: string; value: number }>;
  secondColor?: string;
}

export default function RadarChart({
  stats,
  color = '#818CF8',
  secondStats,
  secondColor = '#F97316',
}: Props) {
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <View style={{ alignSelf: 'center' }}>
      <Svg width={220} height={220} viewBox="0 0 220 220">
        {/* Grid hexagons */}
        {gridLevels.map((level) => (
          <Polygon
            key={level}
            points={hexagonPoints(RADIUS * level)}
            fill="none"
            stroke="#1E293B"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: NUM_SIDES }, (_, i) => {
          const tip = getVertex(i, RADIUS);
          return (
            <Line
              key={i}
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke="#1E293B"
              strokeWidth={1}
            />
          );
        })}

        {/* Stat polygon */}
        <Polygon
          points={statsToPoints(stats)}
          fill={color}
          fillOpacity={0.25}
          stroke={color}
          strokeWidth={2}
        />

        {/* Second stat polygon */}
        {secondStats && (
          <Polygon
            points={statsToPoints(secondStats)}
            fill={secondColor}
            fillOpacity={0.25}
            stroke={secondColor}
            strokeWidth={2}
          />
        )}

        {/* Labels */}
        {STAT_ORDER.map((_, i) => {
          const labelR = RADIUS * 1.15;
          const v = getVertex(i, labelR);
          const anchor =
            v.x < CX - 5 ? 'end' : v.x > CX + 5 ? 'start' : 'middle';
          return (
            <SvgText
              key={i}
              x={v.x}
              y={v.y + 4}
              fontSize={9}
              fill="#64748B"
              textAnchor={anchor}
            >
              {STAT_LABELS[i]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
