"use client";

const TABLE_ROWS = [
  { id: "usr_001", name: "Ada Lovelace", email: "ada@analytical.dev", role: "Admin", status: "Active" },
  { id: "usr_002", name: "Alan Turing", email: "alan@enigma.io", role: "Developer", status: "Active" },
  { id: "usr_003", name: "Grace Hopper", email: "grace@cobol.mil", role: "Admin", status: "Active" },
  { id: "usr_004", name: "Linus Torvalds", email: "linus@kernel.org", role: "Developer", status: "Away" },
  { id: "usr_005", name: "Margaret Hamilton", email: "margaret@apollo.nasa", role: "Lead", status: "Active" },
  { id: "usr_006", name: "Dennis Ritchie", email: "dennis@bell-labs.com", role: "Developer", status: "Inactive" },
  { id: "usr_007", name: "Barbara Liskov", email: "barbara@mit.edu", role: "Lead", status: "Active" },
  { id: "usr_008", name: "Ken Thompson", email: "ken@unix.org", role: "Developer", status: "Active" },
  { id: "usr_009", name: "Radia Perlman", email: "radia@spanning.tree", role: "Admin", status: "Away" },
  { id: "usr_010", name: "Donald Knuth", email: "donald@tex.stanford", role: "Developer", status: "Active" },
  { id: "usr_011", name: "Hedy Lamarr", email: "hedy@frequency.com", role: "Lead", status: "Active" },
  { id: "usr_012", name: "Tim Berners-Lee", email: "tim@w3.org", role: "Admin", status: "Active" },
  { id: "usr_013", name: "Guido van Rossum", email: "guido@python.org", role: "Developer", status: "Away" },
  { id: "usr_014", name: "Brendan Eich", email: "brendan@ecma.intl", role: "Lead", status: "Active" },
  { id: "usr_015", name: "John Carmack", email: "john@id.software", role: "Developer", status: "Active" },
  { id: "usr_016", name: "Fei-Fei Li", email: "fei-li@ai.stanford", role: "Lead", status: "Active" },
  { id: "usr_017", name: "James Gosling", email: "james@java.dev", role: "Developer", status: "Inactive" },
  { id: "usr_018", name: "Anders Hejlsberg", email: "anders@typescript.io", role: "Lead", status: "Active" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-green-500/15 text-green-600 dark:text-green-400",
    Away: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    Inactive: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[status] ?? colors.Inactive}`}>
      {status}
    </span>
  );
}

/**
 * The scrollbar on this panel — and on every scrollable element of this site —
 * is drawn by the single site-wide `ThemeScrollbar` overlay mounted in the root
 * layout. This demo deliberately mounts no second engine: two overlay
 * instances would stack two strips (and two arrow sets) over the same
 * containers. The options the component accepts are shown in the code panel.
 */
export function ScrollbarDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-60">
            Live — themed data table
          </span>
          <span className="chip chip-active text-[11px]">
            {TABLE_ROWS.length} rows
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50">ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider opacity-50">Status</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/40 last:border-0 ${i % 2 === 0 ? "bg-transparent" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-2 mono text-xs opacity-50">{row.id}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-2 opacity-60 hidden sm:table-cell">{row.email}</td>
                  <td className="px-4 py-2">{row.role}</td>
                  <td className="px-4 py-2"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="m-0 text-xs opacity-50 leading-relaxed">
        This panel&apos;s scrollbar — like every scrollbar on this site — is
        drawn by the single site-wide <code className="mono">ThemeScrollbar</code>{" "}
        overlay, so it re-themes with whatever family or mode you pick above. The
        component is configurable: thickness, auto-hide, arrow buttons, track
        visibility, radius, and a <code className="mono">scope</code> to limit
        which containers it takes over. The code panel below shows the
        per-framework setup, and the{" "}
        <a
          href="/custom-scrollbar"
          className="underline decoration-primary/50 underline-offset-2"
        >
          Custom Scrollbar
        </a>{" "}
        guide documents every option.
      </p>
    </div>
  );
}
