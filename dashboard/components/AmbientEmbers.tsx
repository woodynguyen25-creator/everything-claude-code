'use client';

const EMBERS = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  left: `${(index * 11) % 100}%`,
  size: 2 + (index % 3),
  duration: 15 + (index % 6) * 2,
  delay: (index % 5) * 1.5,
  start: `${(index % 7) - 3}px`,
  end: `${((index + 2) % 9) - 4}px`,
}));

export default function AmbientEmbers() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] hidden motion-safe:block">
      {EMBERS.map((ember) => (
        <span
          key={ember.id}
          className="absolute rounded-full bg-ember/40"
          style={{
            left: ember.left,
            width: `${ember.size}px`,
            height: `${ember.size}px`,
            bottom: '-5vh',
            animation: `ember-drift ${ember.duration}s linear ${ember.delay}s infinite`,
            ['--drift-x-start' as string]: ember.start,
            ['--drift-x-end' as string]: ember.end,
          }}
        />
      ))}
    </div>
  );
}
