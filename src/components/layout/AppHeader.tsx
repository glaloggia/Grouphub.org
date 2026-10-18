
"use client";

import { Logo } from "@/components/shared/Logo";
import { UserNav } from "@/components/layout/UserNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell, Sun, Moon, MessageSquare, UserPlus, Users as UsersIcon, MessageSquareText, CheckCheck } from "lucide-react";
import { useTheme } from "@/context/ThemeProvider";
import { useNotificationData } from "@/hooks/useNotificationData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const translations = {
  en: {
    notifications: "Notifications",
    loading: "Loading...",
    noNewNotifications: "No new notifications",
    unreadMessage: "Unread Message",
    unreadMessages: "Unread Messages",
    friendRequest: "Friend Request",
    friendRequests: "Friend Requests",
    groupJoinRequest: "Group Join Request",
    groupJoinRequests: "Group Join Requests",
    toggleTheme: "Toggle theme",
    newMessagesIn: "New messages in",
    newReplyIn: "New reply in thread:",
    clearAll: "Mark all as read",
    newNotificationArrived: "You have new notifications!",
  },
  es: {
    notifications: "Notificaciones",
    loading: "Cargando...",
    noNewNotifications: "No hay notificaciones nuevas",
    unreadMessage: "Mensaje no Leído",
    unreadMessages: "Mensajes no Leídos",
    friendRequest: "Solicitud de Amistad",
    friendRequests: "Solicitudes de Amistad",
    groupJoinRequest: "Solicitud para Unirse al Grupo",
    groupJoinRequests: "Solicitudes para Unirse al Grupo",
    toggleTheme: "Cambiar tema",
    newMessagesIn: "Nuevos mensajes en",
    newReplyIn: "Nueva respuesta en el hilo:",
    clearAll: "Marcar todo como leído",
    newNotificationArrived: "¡Tienes nuevas notificaciones!",
  },
  pt: {
    notifications: "Notificações",
    loading: "Carregando...",
    noNewNotifications: "Nenhuma nova notificação",
    unreadMessage: "Mensagem Não Lida",
    unreadMessages: "Mensagens Não Lidas",
    friendRequest: "Pedido de Amizade",
    friendRequests: "Pedidos de Amizade",
    groupJoinRequest: "Pedido para Entrar no Grupo",
    groupJoinRequests: "Pedidos para Entrar no Grupo",
    toggleTheme: "Alternar tema",
    newMessagesIn: "Novas mensagens em",
    newReplyIn: "Nova resposta no tópico:",
    clearAll: "Marcar todas como lidas",
    newNotificationArrived: "Você tem novas notificações!",
  },
  fr: {
    notifications: "Notifications",
    loading: "Chargement...",
    noNewNotifications: "Aucune nouvelle notification",
    unreadMessage: "Message non lu",
    unreadMessages: "Messages non lus",
    friendRequest: "Demande d'ami",
    friendRequests: "Demandes d'ami",
    groupJoinRequest: "Demande d'adhésion au groupe",
    groupJoinRequests: "Demandes d'adhésion au groupe",
    toggleTheme: "Changer de thème",
    newMessagesIn: "Nouveaux messages dans",
    newReplyIn: "Nouvelle réponse dans le sujet :",
    clearAll: "Tout marquer comme lu",
    newNotificationArrived: "Vous avez de nouvelles notifications !",
  },
  de: {
    notifications: "Benachrichtigungen",
    loading: "Wird geladen...",
    noNewNotifications: "Keine neuen Benachrichtigungen",
    unreadMessage: "Ungelesene Nachricht",
    unreadMessages: "Ungelesene Nachrichten",
    friendRequest: "Freundschaftsanfrage",
    friendRequests: "Freundschaftsanfragen",
    groupJoinRequest: "Gruppenbeitrittsanfrage",
    groupJoinRequests: "Gruppenbeitrittsanfragen",
    toggleTheme: "Thema wechseln",
    newMessagesIn: "Neue Nachrichten in",
    newReplyIn: "Neue Antwort im Thread:",
    clearAll: "Alle als gelesen markieren",
    newNotificationArrived: "Du hast neue Benachrichtigungen!",
  },
  it: {
    notifications: "Notifiche",
    loading: "Caricamento...",
    noNewNotifications: "Nessuna nuova notifica",
    unreadMessage: "Messaggio non Letto",
    unreadMessages: "Messaggi non Letti",
    friendRequest: "Richiesta di Amicizia",
    friendRequests: "Richieste di Amicizia",
    groupJoinRequest: "Richiesta di Iscrizione al Gruppo",
    groupJoinRequests: "Richieste di Iscrizione al Gruppo",
    toggleTheme: "Cambia tema",
    newMessagesIn: "Nuovi messaggi in",
    newReplyIn: "Nuova risposta nella discussione:",
    clearAll: "Segna tutto come letto",
    newNotificationArrived: "Hai nuove notifiche!",
  },
  ru: {
    notifications: "Уведомления",
    loading: "Загрузка...",
    noNewNotifications: "Нет новых уведомлений",
    unreadMessage: "Непрочитанное сообщение",
    unreadMessages: "Непрочитанные сообщения",
    friendRequest: "Запрос в друзья",
    friendRequests: "Запросы в друзья",
    groupJoinRequest: "Запрос на вступление в группу",
    groupJoinRequests: "Запросы на вступление в группу",
    toggleTheme: "Переключить тему",
    newMessagesIn: "Новые сообщения в",
    newReplyIn: "Новый ответ в теме:",
    clearAll: "Отметить все как прочитанные",
    newNotificationArrived: "У вас новые уведомления!",
  }
};


export function AppHeader() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { notificationData, isLoading: notificationsLoading, clearAllNotifications } = useNotificationData();
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  const [showPopup, setShowPopup] = useState(false);
  const prevCountRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (translations[browserLang as keyof typeof translations]) setLang(browserLang as any);
    }
  }, []);

  const t = translations[lang] || translations['en'];

  // Handle popup logic when notification count increases
  useEffect(() => {
    if (!notificationsLoading) {
      if (prevCountRef.current !== undefined && notificationData.totalNotifications > prevCountRef.current) {
        setShowPopup(true);
        const timer = setTimeout(() => setShowPopup(false), 5000);
        return () => clearTimeout(timer);
      }
      prevCountRef.current = notificationData.totalNotifications;
    }
  }, [notificationData.totalNotifications, notificationsLoading]);

  // Ensure theme state is resolved before rendering theme-dependent icons
  const currentDisplayTheme = resolvedTheme || theme;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="md:hidden mr-2">
          <SidebarTrigger />
        </div>
        <div className="hidden md:block">
         <Logo size="sm" href="/dashboard"/>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2 relative">
          
          {/* New Notification Popup */}
          {showPopup && (
            <div className="absolute top-16 right-0 z-50 animate-in slide-in-from-top-2 duration-300 pointer-events-none">
              <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-primary-foreground/20 pointer-events-auto">
                <div className="bg-white/20 p-1.5 rounded-full">
                  <Bell className="h-4 w-4 animate-bounce" />
                </div>
                <span className="text-sm font-bold whitespace-nowrap">{t.newNotificationArrived}</span>
              </div>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.notifications} className="relative">
                <Bell className="h-5 w-5" />
                {!notificationsLoading && notificationData.totalNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center rounded-full text-xs"
                  >
                    {notificationData.totalNotifications > 9 ? "9+" : notificationData.totalNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 p-0">
              <div className="flex items-center justify-between px-4 py-2">
                <DropdownMenuLabel className="p-0">{t.notifications}</DropdownMenuLabel>
                {notificationData.totalNotifications > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearAllNotifications();
                    }}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t.clearAll}
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-[400px]">
                <div className="p-1">
                  {notificationsLoading ? (
                    <DropdownMenuItem disabled className="justify-center py-4">{t.loading}</DropdownMenuItem>
                  ) : notificationData.totalNotifications === 0 ? (
                    <div className="text-center text-muted-foreground py-6 text-sm">
                      {t.noNewNotifications}
                    </div>
                  ) : (
                    <>
                      {/* Individual Group Notifications */}
                      {notificationData.activeGroupsWithNewMessages.map((group) => (
                        <DropdownMenuItem key={group.id} asChild>
                          <Link href={`/groups/${group.id}`} className="flex items-start gap-3 p-3">
                            <UsersIcon className="mt-1 h-4 w-4 text-primary shrink-0" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">{t.newMessagesIn}</span>
                              <span className="text-xs text-muted-foreground font-semibold">{group.name}</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}

                      {/* Individual Forum Thread Notifications */}
                      {notificationData.activeThreadsWithNewMessages.map((thread) => (
                        <DropdownMenuItem key={thread.id} asChild>
                          <Link href={`/forums/${thread.forumId}/${thread.id}`} className="flex items-start gap-3 p-3">
                            <MessageSquareText className="mt-1 h-4 w-4 text-primary shrink-0" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm">{t.newReplyIn}</span>
                              <span className="text-xs text-muted-foreground font-semibold line-clamp-1">{thread.title}</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}

                      {notificationData.unreadMessagesCount > 0 && (
                        <DropdownMenuItem asChild>
                          <Link href="/messages" className="flex items-center gap-3 p-3">
                            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm">{notificationData.unreadMessagesCount} {notificationData.unreadMessagesCount > 1 ? t.unreadMessages : t.unreadMessage}</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {notificationData.pendingFriendRequestsCount > 0 && (
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="flex items-center gap-3 p-3">
                            <UserPlus className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm">{notificationData.pendingFriendRequestsCount} {notificationData.pendingFriendRequestsCount > 1 ? t.friendRequests : t.friendRequest}</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {notificationData.pendingGroupJoinRequestsCount > 0 && (
                        <DropdownMenuItem asChild>
                          <Link href="/groups" className="flex items-center gap-3 p-3">
                            <UsersIcon className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm">{notificationData.pendingGroupJoinRequestsCount} {notificationData.pendingGroupJoinRequestsCount > 1 ? t.groupJoinRequests : t.groupJoinRequest}</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(currentDisplayTheme === "dark" ? "light" : "dark")}
            aria-label={t.toggleTheme}
          >
            {currentDisplayTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
