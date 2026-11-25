'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import * as Popover from '@radix-ui/react-popover';
import { Input } from '@/components/ui/input';

import './GlideSelect.css';

const SIZES = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 14 }
};
const GAP = 1;
const MENU_GAP = 6;
const DEFAULT_OPTIONS = ['One', 'Two', 'Three'];

const norm = o => (typeof o === 'string' ? { value: o, label: o } : o);
const textOf = it => (typeof it.label === 'string' ? it.label : it.value);
const typeaheadIndex = (items, from, ch) => {
  const c = ch.toLowerCase();
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!items[i].disabled && (items[i].textValue ?? textOf(items[i])).toLowerCase().startsWith(c)) return i;
  }
  return from;
};

export default function GlideSelect({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  search,
  disabled = false,
  ariaLabel = 'Select',
  className = '',
  triggerProps = {},
  portal = false
}) {
  const items = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const selected = items.findIndex(it => it.value === current);
  const [phase, setPhase] = useState('closed');
  const [active, setActive] = useState(null);
  const [side, setSide] = useState(placement);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const [menuElement, setMenuElement] = useState(null);
  const attachMenu = useCallback(node => {
    menuRef.current = node;
    setMenuElement(node);
  }, []);
  const pillRef = useRef(null);
  const instant = useRef(false);
  const closeTimer = useRef(undefined);
  const scrub = useRef(null);
  const id = useId();
  const listId = `${id}-list`;
  const menuId = `${id}-menu`;
  const activeId = active !== null && items[active] && !items[active].disabled ? `${id}-${active}` : undefined;
  const S = SIZES[size] ?? SIZES.md;
  const step = S.row + GAP;
  const popOut = Math.round((popDuration * 2) / 3);

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const el = menuRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const r = root.getBoundingClientRect();
    const need = el.offsetHeight + MENU_GAP;
    setSide(
      placement === 'bottom' && r.bottom + need > window.innerHeight
        ? 'top'
        : placement === 'top' && r.top - need < 0
          ? 'bottom'
          : placement
    );
    el.style.transitionDuration = instant.current ? '0ms' : '';
    el.dataset.state = 'closed';
    void el.offsetHeight;
    el.dataset.state = 'open';
    const p = pillRef.current;
    if (p) {
      p.style.transition = 'none';
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      p.style.opacity = '0';
      void p.offsetHeight;
      p.style.transition = '';
    }
    searchRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, menuElement]);

  useLayoutEffect(() => {
    const p = pillRef.current;
    if (!p || phase !== 'open') return;
    if (!activeId) {
      p.style.opacity = '0';
      return;
    }
    const jump = instant.current || p.style.opacity !== '1';
    p.style.transitionDuration = jump ? '0ms, 150ms' : '';
    p.style.transform = `translateY(${active * step}px)`;
    p.style.opacity = '1';
    instant.current = false;
    if (portal) menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, activeId, phase, step, menuElement, portal]);

  const open = viaKey => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    instant.current = true;
    const first = items.findIndex(it => !it.disabled);
    setActive(selected >= 0 && !items[selected].disabled ? selected : viaKey && first >= 0 ? first : null);
    setPhase('open');
  };
  const close = mode => {
    setActive(null);
    if (search?.value) search.onChange('');
    clearTimeout(closeTimer.current);
    const el = menuRef.current;
    if (mode === 'instant' || !el) {
      setPhase('closed');
      return;
    }
    el.style.transitionDuration = '';
    el.dataset.state = 'closed';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };
  const pick = (i, viaKey) => {
    const it = items[i];
    if (!it) {
      close('instant');
      return;
    }
    if (it.disabled) return;
    if (it.value !== current) {
      if (value === undefined) setInner(it.value);
      onChange?.(it.value, it);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
    }
    close('instant');
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onTriggerKey = e => {
    const k = e.key;
    if (phase === 'open' && k === 'Escape') e.stopPropagation();
    const n = items.length;
    const cur = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const go = (i, direction = 1) => {
      e.preventDefault();
      instant.current = true;
      let next = Math.min(n - 1, Math.max(0, i));
      while (next >= 0 && next < n && items[next].disabled) next += direction;
      if (next >= 0 && next < n) setActive(next);
    };
    if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1), k === 'ArrowDown' ? 1 : -1);
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1, k === 'Home' ? 1 : -1);
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      pick(cur, true);
    } else if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') e.preventDefault();
      close('instant');
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k));
  };

  const onSearchKey = e => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Tab') {
      e.stopPropagation();
      triggerRef.current?.focus({ preventScroll: true });
      close('instant');
    } else if (e.key === 'Escape') {
      onTriggerKey(e);
      triggerRef.current?.focus({ preventScroll: true });
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!search.busy) onTriggerKey(e);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!search.busy && activeId) pick(active, true);
    }
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target) && !menuRef.current?.contains(e.target)) close('pop');
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const rowAt = y => {
    const s = scrub.current;
    if (!s) return null;
    const i = Math.floor((y - s.top + (menuRef.current?.scrollTop ?? 0)) / step);
    return i >= 0 && i < items.length && !items[i].disabled ? i : null;
  };
  const onListDown = e => {
    if (scrub.current || (portal && e.pointerType === 'touch')) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    scrub.current = { id: e.pointerId, top: e.currentTarget.getBoundingClientRect().top + (menuRef.current?.scrollTop ?? 0) };
    instant.current = true;
    setActive(rowAt(e.clientY));
  };
  const onListMove = e => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = rowAt(e.clientY);
    if (i !== active) setActive(i);
  };
  const onListUp = e => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return;
    const i = e.type === 'pointerup' ? rowAt(e.clientY) : null;
    scrub.current = null;
    if (i !== null) pick(i, false);
    else if (!rememberPosition) setActive(null);
  };
  const onListOver = e => {
    if (e.pointerType === 'touch' || scrub.current) return;
    const row = e.target.closest('[data-index]');
    if (!row) return;
    const index = Number(row.dataset.index);
    const i = items[index]?.disabled ? null : index;
    if (i !== active) setActive(i);
  };

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align}`;
  const variables = {
    '--gs-accent': accentColor,
    '--gs-surface': surfaceColor,
    '--gs-highlight': highlightColor,
    '--gs-text': textColor,
    '--gs-radius': `${radius}px`,
    '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
    '--gs-chip': `${S.chip}px`,
    '--gs-row': `${S.row}px`,
    '--gs-font': `${S.font}px`,
    '--gs-menu-w': `${menuWidth}px`,
    '--gs-pop': `${popDuration}ms`,
    '--gs-pop-out': `${popOut}ms`,
    '--gs-glide': `${glideDuration}ms`,
    '--gs-origin': origin,
    '--gs-ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)'
  };
  const menu = phase !== 'closed' ? (
    <div ref={attachMenu} id={search ? menuId : undefined}
      className="glide-select__menu" data-state="open" data-side={side} data-align={align}
      data-gs-portal={portal ? '' : undefined} data-gs-search={search ? '' : undefined} style={variables}>
      {search && <div className="glide-select__search">
        <Input ref={searchRef} type="search" role="combobox" aria-label={search.label} aria-autocomplete="list"
          aria-controls={listId} aria-expanded={phase === 'open'} aria-activedescendant={search.busy ? undefined : activeId}
          value={search.value} placeholder={search.placeholder} maxLength={search.maxLength} autoComplete="off"
          className="h-11 bg-background"
          onChange={e => { setActive(null); search.onChange(e.target.value); }}
          onKeyDownCapture={onSearchKey} />
      </div>}
      <div
        id={listId}
        role="listbox"
        aria-label={ariaLabel ?? triggerProps['aria-label']}
        aria-labelledby={triggerProps['aria-labelledby'] ?? (ariaLabel ? undefined : triggerProps.id)}
        aria-busy={search?.busy || undefined}
        className="glide-select__list"
        data-live={activeId ? '' : undefined}
        onPointerOver={onListOver}
        onPointerLeave={() => {
          if (!scrub.current && !rememberPosition) setActive(null);
        }}
        onPointerDown={onListDown}
        onPointerMove={onListMove}
        onPointerUp={onListUp}
        onPointerCancel={onListUp}
        onLostPointerCapture={onListUp}
      >
        <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
        {items.map((it, i) => (
          <div
            key={it.value}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === selected}
            aria-disabled={it.disabled || undefined}
            data-index={i}
            className="glide-select__option"
            onClick={e => {
              if (e.detail === 0 || e.nativeEvent.pointerType === 'touch') pick(i, false);
            }}
          >
            <span className="glide-select__name">{it.label}</span>
            {showTags && it.tag ? <span className="glide-select__tag">{it.tag}</span> : null}
            <span className="glide-select__check" data-on={i === selected ? '' : undefined} aria-hidden="true">
              <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
            </span>
          </div>
        ))}
      </div>
      {search?.status && <p role="status" className="px-2.5 py-2 text-sm text-muted-foreground">{search.status}</p>}
    </div>
  ) : null;
  const control = (
    <div
      ref={rootRef}
      className={`glide-select${className ? ` ${className}` : ''}`}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={variables}
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <button
        {...triggerProps}
        ref={node => {
          triggerRef.current = node;
          if (typeof triggerProps.ref === 'function') triggerProps.ref(node);
          else if (triggerProps.ref) triggerProps.ref.current = node;
        }}
        type="button"
        role={search ? undefined : 'combobox'}
        aria-haspopup={search ? 'dialog' : 'listbox'}
        aria-expanded={phase === 'open'}
        aria-controls={search ? menuId : listId}
        aria-activedescendant={search ? undefined : activeId}
        aria-label={ariaLabel}
        disabled={disabled}
        className="glide-select__trigger"
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return;
          e.currentTarget.focus({ preventScroll: true });
          if (phase === 'open') close('pop');
          else open(false);
        }}
        onKeyDown={e => {
          triggerProps.onKeyDown?.(e);
          if (!e.defaultPrevented) onTriggerKey(e);
        }}
        onClick={e => {
          triggerProps.onClick?.(e);
          if (!e.defaultPrevented && e.detail === 0) {
            if (phase === 'open') close('pop');
            else open(true);
          }
        }}
      >
        <span className="glide-select__label" key={current} data-empty={selected < 0 ? '' : undefined}>
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2.5} />
        </span>
      </button>
      {!portal && menu}
    </div>
  );
  if (!portal) return control;
  return (
    <Popover.Root open={phase !== 'closed'} onOpenChange={next => { if (!next) close('pop'); }}>
      <Popover.Anchor asChild>{control}</Popover.Anchor>
      {phase !== 'closed' && (
        <Popover.Portal>
          <Popover.Content asChild side={side} align={align === 'right' ? 'end' : 'start'}
            sideOffset={MENU_GAP} collisionPadding={8} role={search ? 'dialog' : 'presentation'}
            aria-label={search?.label}
            onOpenAutoFocus={e => e.preventDefault()}
            onCloseAutoFocus={e => e.preventDefault()}
            onFocusOutside={e => {
              if (search && triggerRef.current?.contains(e.target)) e.preventDefault();
            }}
            onEscapeKeyDown={e => { e.preventDefault(); close('instant'); triggerRef.current?.focus({ preventScroll: true }); }}>
            {menu}
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
