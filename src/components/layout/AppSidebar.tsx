
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  CalendarDays,
  UserCircle,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
  Shield,
  Brain,
  Users2,
  AlertTriangle,
  Megaphone,
} from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotificationData } from "@/hooks/useNotificationData";

type TranslationKey = 'Dashboard' | 'Groups' | 'Messages' | 'Events' | 'Profile' | 'Collapse' | 'Expand' | 'Logout' | 'Forums' | 'Admin' | 'Users' | 'Reports' | 'Announcements';

interface NavItem {
  key: TranslationKey;
  href: string;
  icon: LucideIcon;
  subItems?: NavItem[];
}

const navTranslations = {
  en: {
    Dashboard: "Dashboard",
    Groups: "Groups",
    Forums: "Psycho Forums",
    Messages: "Messages",
    Events: "Events",
    Profile: "Profile",
    Collapse: "Collapse",
    Expand: "Expand",
    Logout: "Logout",
    Admin: "Admin",
    Users: "Users",
    Reports: "Reports",
    Announcements: "Announcements",
  },
  es: {
    Dashboard: "Panel",
    Groups: "Grupos",
    Forums: "Foros Psico",
    Messages: "Mensajes",
    Events: "Eventos",
    Profile: "Perfil",
    Collapse: "Contraer",
    Expand: "Expandir",
    Logout: "Cerrar sesión",
    Admin: "Admin",
    Users: "Usuarios",
    Reports: "Reportes",
    Announcements: "Anuncios",
  },
  pt: {
    Dashboard: "Painel",
    Groups: "Grupos",
    Forums: "Fóruns Psico",
    Messages: "Mensagens",
    Events: "Eventos",
    Profile: "Perfil",
    Collapse: "Recolher",
    Expand: "Expandir",
    Logout: "Sair",
    Admin: "Admin",
    Users: "Usuários",
    Reports: "Relatórios",
    Announcements: "Anúncios",
  },
  fr: {
    Dashboard: "Tableau de bord",
    Groups: "Groupes",
    Forums: "Forums Psycho",
    Messages: "Messages",
    Events: "Événements",
    Profile: "Profil",
    Collapse: "Réduire",
    Expand: "Agrandir",
    Logout: "Déconnexion",
    Admin: "Admin",
    Users: "Utilisateurs",
    Reports: "Rapports",
    Announcements: "Annonces",
  },
  de: {
    Dashboard: "Dashboard",
    Groups: "Gruppen",
    Forums: "Psycho-Foren",
    Messages: "Nachrichten",
    Events: "Events",
    Profile: "Profil",
    Collapse: "Einklappen",
    Expand: "Erweitern",
    Logout: "Abmelden",
    Admin: "Admin",
    Users: "Benutzer",
    Reports: "Meldungen",
    Announcements: "Ankündigungen",
  },
  it: {
    Dashboard: "Cruscotto",
    Groups: "Gruppi",
    Forums: "Forum Psico",
    Messages: "Messaggi",
    Events: "Eventi",
    Profile: "Profilo",
    Collapse: "Comprimi",
    Expand: "Espandi",
    Logout: "Esci",
    Admin: "Admin",
    Users: "Utenti",
    Reports: "Segnalazioni",
    Announcements: "Annunci",
  },
  ru: {
    Dashboard: "Панель",
    Groups: "Группы",
    Forums: "Психо-форумы",
    Messages: "Сообщения",
    Events: "События",
    Profile: "Профиль",
    Collapse: "Свернуть",
    Expand: "Развернуть",
    Logout: "Выйти",
    Admin: "Админ",
    Users: "Пользователи",
    Reports: "Жалобы",
    Announcements: "Объявления",
  }
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, key: "Dashboard" },
  { href: "/groups", icon: Users, key: "Groups" },
  { href: "/forums", icon: Brain, key: "Forums" },
  { href: "/messages", icon: MessageCircle, key: "Messages" },
  { href: "/events", icon: CalendarDays, key: "Events" },
  { href: "/profile", icon: UserCircle, key: "Profile" },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile, toggleSidebar, state, isMobile } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({});
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'es') setLang('es');
      else if (browserLang === 'pt') setLang('pt');
      else if (browserLang === 'fr') setLang('fr');
      else if (browserLang === 'de') setLang('de');
      else if (browserLang === 'it') setLang('it');
      else if (browserLang === 'ru') setLang('ru');
    }
  }, []);

  const t = (key: TranslationKey) => navTranslations[lang][key] || navTranslations['en'][key];

  const handleLinkClick = () => {
    setOpenMobile(false);
  };
  
  const toggleSubmenu = (itemKey: TranslationKey) => {
    setOpenSubmenus(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/"); 
    } catch (error) {
      console.error("Logout failed from sidebar", error);
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-4 border-b group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:border-b-0">
        <Logo size="md" href="/dashboard" />
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              {item.subItems ? (
                <>
                  <SidebarMenuButton
                    onClick={() => toggleSubmenu(item.key)}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{children: t(item.key), side: 'right'}}
                  >
                    <item.icon />
                    <span>{t(item.key)}</span>
                    {openSubmenus[item.key] ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
                  </SidebarMenuButton>
                  {openSubmenus[item.key] && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.key}>
                          <Link href={subItem.href} passHref legacyBehavior>
                            <SidebarMenuSubButton
                              isActive={pathname === subItem.href}
                              onClick={handleLinkClick}
                            >
                              <subItem.icon />
                              <span>{t(subItem.key)}</span>
                            </SidebarMenuSubButton>
                          </Link>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                    onClick={handleLinkClick}
                    tooltip={{children: t(item.key), side: 'right'}}
                    className="relative"
                  >
                    <item.icon />
                    <span>{t(item.key)}</span>
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {isOwner && (
            <>
                <SidebarSeparator className="my-2" />
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => toggleSubmenu('Admin')}
                        isActive={pathname.startsWith('/admin')}
                        tooltip={{children: t('Admin'), side: 'right'}}
                    >
                        <Shield />
                        <span>{t('Admin')}</span>
                        {openSubmenus['Admin'] ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
                    </SidebarMenuButton>
                    {openSubmenus['Admin'] && (
                        <SidebarMenuSub>
                            <SidebarMenuSubItem>
                                <Link href="/admin/users" passHref legacyBehavior>
                                    <SidebarMenuSubButton isActive={pathname.startsWith('/admin/users')} onClick={handleLinkClick}>
                                        <Users /><span>{t('Users')}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                                <Link href="/admin/groups" passHref legacyBehavior>
                                    <SidebarMenuSubButton isActive={pathname.startsWith('/admin/groups')} onClick={handleLinkClick}>
                                        <Users2 /><span>{t('Groups')}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                                <Link href="/admin/announcements" passHref legacyBehavior>
                                    <SidebarMenuSubButton isActive={pathname.startsWith('/admin/announcements')} onClick={handleLinkClick}>
                                        <Megaphone /><span>{t('Announcements')}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                                <Link href="/admin/reports" passHref legacyBehavior>
                                    <SidebarMenuSubButton isActive={pathname.startsWith('/admin/reports')} onClick={handleLinkClick}>
                                        <AlertTriangle /><span>{t('Reports')}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        {!isMobile && ( 
          <SidebarMenuButton
            onClick={toggleSidebar}
            className="w-full" 
            tooltip={{
              children: state === "expanded" ? t('Collapse') : t('Expand'),
              side: 'right'
            }}
          >
            {state === "expanded" ? <ChevronsLeft /> : <ChevronsRight />}
            <span className="group-data-[collapsible=icon]:hidden">
              {state === "expanded" ? t('Collapse') : t('Expand')}
            </span>
          </SidebarMenuButton>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
          onClick={handleLogout} 
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">{t('Logout')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
