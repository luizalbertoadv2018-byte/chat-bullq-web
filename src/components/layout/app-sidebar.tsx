'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronsUpDown,
  Building2,
  ChevronUp,
  ChevronDown,
  Home,
  Plug,
  Headset,
  MessagesSquare,
  Users,
  Columns3,
  Workflow,
  Bot,
  BookOpen,
  AudioLines,
  Blocks,
  ListTodo,
  CalendarClock,
  LifeBuoy,
  GraduationCap,
} from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarSection,
  SidebarItem,
  SidebarLabel,
  SidebarSpacer,
} from '@/components/ui/sidebar';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';

/**
 * Navegação inspirada na LiderHub (adaptada ao Chat BullQ):
 * grupos colapsáveis para Atendimento e Automações, itens simples no resto.
 */
type NavLeaf = { href: string; label: string; icon: typeof Home };
type NavGroup = { label: string; icon: typeof Home; children: NavLeaf[] };

const topItems: NavLeaf[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/connections', label: 'Conexões', icon: Plug },
];

const atendimento: NavGroup = {
  label: 'Atendimento',
  icon: Headset,
  children: [
    { href: '/inbox', label: 'Conversas', icon: MessagesSquare },
    { href: '/contacts', label: 'Contatos', icon: Users },
    { href: '/pipelines', label: 'Kanban', icon: Columns3 },
  ],
};

const automacoes: NavGroup = {
  label: 'Automações',
  icon: Workflow,
  children: [
    { href: '/ai-agents', label: 'Agentes', icon: Bot },
    { href: '/knowledge', label: 'Base de Conhecimento', icon: BookOpen },
    { href: '/voices', label: 'Vozes', icon: AudioLines },
    { href: '/integrations', label: 'Integrações', icon: Blocks },
  ],
};

const midItems: NavLeaf[] = [
  { href: '/tasks', label: 'Tarefas', icon: ListTodo },
  { href: '/schedules', label: 'Agendamentos', icon: CalendarClock },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

const bottomItems: NavLeaf[] = [
  { href: '/support', label: 'Suporte', icon: LifeBuoy },
  { href: '/academy', label: 'Academy', icon: GraduationCap },
];

function CollapsibleGroup({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const hasActiveChild = group.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(hasActiveChild);
  const GroupIcon = group.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm/6 font-medium transition-colors',
          hasActiveChild
            ? 'text-zinc-950 dark:text-white'
            : 'text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
        )}
      >
        <GroupIcon
          className={cn('size-5', hasActiveChild && 'text-primary')}
        />
        <span className="flex-1 truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-zinc-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-zinc-950/5 pl-2 dark:border-white/5">
          {group.children.map((child) => (
            <SidebarItem key={child.href} href={child.href}>
              <child.icon className="size-4" />
              <SidebarLabel>{child.label}</SidebarLabel>
            </SidebarItem>
          ))}
        </div>
      )}
    </div>
  );
}

function LeafItem({ item }: { item: NavLeaf }) {
  const pathname = usePathname();
  const isActive =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <SidebarItem href={item.href}>
      <item.icon className={cn('size-5', isActive && 'text-primary')} />
      <SidebarLabel>{item.label}</SidebarLabel>
    </SidebarItem>
  );
}

export function AppSidebar() {
  const { user, organizations, activeOrgId, setActiveOrg, logout } =
    useAuthStore();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);

  const handleOrgSwitch = (orgId: string) => {
    setActiveOrg(orgId);
    window.location.reload();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Dropdown>
          <DropdownButton className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm/6 font-semibold text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5">
            <img
              src="/brand/logo-mark.png"
              alt={activeOrg?.name ?? 'Alberto Martins Advocacia'}
              className="size-6 shrink-0 object-contain dark:invert"
            />
            <span className="min-w-0 flex-1 truncate">
              {activeOrg?.name ?? 'Organização'}
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-zinc-500" />
          </DropdownButton>
          {organizations.length > 1 && (
            <DropdownMenu anchor="bottom start" className="min-w-56">
              {organizations.map((org) => (
                <DropdownItem
                  key={org.id}
                  onClick={() => handleOrgSwitch(org.id)}
                >
                  <Building2 />
                  <DropdownLabel>{org.name}</DropdownLabel>
                </DropdownItem>
              ))}
            </DropdownMenu>
          )}
        </Dropdown>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {topItems.map((item) => (
            <LeafItem key={item.href} item={item} />
          ))}
        </SidebarSection>

        <SidebarSection>
          <CollapsibleGroup group={atendimento} />
          <CollapsibleGroup group={automacoes} />
        </SidebarSection>

        <SidebarSection>
          {midItems.map((item) => (
            <LeafItem key={item.href} item={item} />
          ))}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          {bottomItems.map((item) => (
            <LeafItem key={item.href} item={item} />
          ))}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <Dropdown>
          <DropdownButton className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-zinc-950/5 dark:hover:bg-white/5">
            <Avatar
              src={user?.avatarUrl}
              initials={user?.name?.slice(0, 2).toUpperCase()}
              className="size-10"
              square
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                {user?.name}
              </span>
              <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                {user?.email}
              </span>
            </span>
            <ChevronUp className="ml-auto size-4 shrink-0 text-zinc-500" />
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-56">
            <DropdownItem href="/settings">
              <Settings />
              <DropdownLabel>Configurações</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={logout}>
              <LogOut />
              <DropdownLabel>Sair</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );
}
