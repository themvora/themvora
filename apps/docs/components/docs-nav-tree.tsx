"use client";

import Link from "next/link";

import {
  DOCS_NAV,
  isDocsNavLinkActive,
  type DocsNavGroup,
  type DocsNavLink,
  type DocsNavNode,
} from "../lib/docs-nav";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`docs-nav-chevron shrink-0 ${open ? "docs-nav-chevron-open" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function NavLinkItem({
  item,
  pathname,
  onNavigate,
}: {
  item: DocsNavLink;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const active = isDocsNavLinkActive(pathname, item);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate?.()}
        className={`docs-nav-link ${active ? "docs-nav-link-active" : ""}`}
      >
        {item.label}
      </Link>
    </li>
  );
}

function NavGroupItem({
  node,
  pathname,
  expanded,
  onToggle,
  onNavigate,
  idPrefix,
}: {
  node: DocsNavGroup;
  pathname: string;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
  idPrefix: string;
}) {
  const open = expanded.has(node.id);
  const buttonId = `docs-nav-${idPrefix}-toggle-${node.id}`;
  const panelId = `docs-nav-${idPrefix}-panel-${node.id}`;

  return (
    <li className="docs-nav-group">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(node.id)}
        className="docs-nav-group-toggle"
      >
        <span className="min-w-0">{node.label}</span>
        <Chevron open={open} />
      </button>
      <div
        id={panelId}
        role="group"
        aria-labelledby={buttonId}
        inert={!open}
        className={`docs-nav-collapse ${open ? "docs-nav-collapse-open" : ""}`}
      >
        <div className="docs-nav-collapse-inner">
          <ul className="docs-nav-sublist">
            {node.children.map((child) => (
              <NavNode
                key={child.kind === "link" ? child.href : child.id}
                node={child}
                pathname={pathname}
                expanded={expanded}
                onToggle={onToggle}
                onNavigate={onNavigate}
                idPrefix={idPrefix}
              />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

function NavNode(props: {
  node: DocsNavNode;
  pathname: string;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
  idPrefix: string;
}) {
  if (props.node.kind === "link") {
    return (
      <NavLinkItem
        item={props.node}
        pathname={props.pathname}
        onNavigate={props.onNavigate}
      />
    );
  }
  return <NavGroupItem {...props} node={props.node} />;
}

/**
 * The hierarchical documentation explorer.
 *
 * Rendered twice — once in the desktop panel, once in the mobile drawer — so
 * all `aria-controls` ids are namespaced with `idPrefix`. Expansion state is
 * owned by `DocsLayout` and shared, which is what keeps the two copies in step
 * and lets the open groups survive a client-side navigation.
 */
export function DocsNavTree({
  pathname,
  expanded,
  onToggle,
  onNavigate,
  idPrefix,
}: {
  pathname: string;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onNavigate?: (() => void) | undefined;
  idPrefix: string;
}) {
  return (
    <div className="docs-nav-tree">
      {DOCS_NAV.map((section) => {
        const open = expanded.has(section.id);
        const buttonId = `docs-nav-${idPrefix}-section-${section.id}`;
        const panelId = `docs-nav-${idPrefix}-section-panel-${section.id}`;

        return (
          <section
            key={section.id}
            className="docs-nav-section"
            aria-labelledby={buttonId}
          >
            <h2 className="docs-nav-section-heading">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggle(section.id)}
                className="docs-nav-section-toggle"
              >
                <span>{section.heading}</span>
                <Chevron open={open} />
              </button>
            </h2>
            <div
              id={panelId}
              role="group"
              aria-labelledby={buttonId}
              inert={!open}
              className={`docs-nav-collapse ${open ? "docs-nav-collapse-open" : ""}`}
            >
              <div className="docs-nav-collapse-inner">
                <ul className="docs-nav-list">
                  {section.children.map((child) => (
                    <NavNode
                      key={child.kind === "link" ? child.href : child.id}
                      node={child}
                      pathname={pathname}
                      expanded={expanded}
                      onToggle={onToggle}
                      onNavigate={onNavigate}
                      idPrefix={idPrefix}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
