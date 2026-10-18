
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/shared/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, UserPlus, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { ContactableUser } from "@/types";
import Link from "next/link";
import { S_startConversation } from '@/actions/message-actions';
import { S_getUserFriends } from '@/actions/friend-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";

const translations = {
  en: {
    pageTitle: "New Message",
    pageDescription: "Select a user to start a conversation.",
    backButton: "Back to Messages",
    cardTitle: "Start a New Chat",
    cardDescription: "Choose someone from your friends list to begin messaging.",
    noFriendsTitle: "You haven't added any friends yet.",
    manageFriendsButton: "Manage Friends",
  },
  es: {
    pageTitle: "Nuevo Mensaje",
    pageDescription: "Selecciona un usuario para iniciar una conversación.",
    backButton: "Volver a Mensajes",
    cardTitle: "Iniciar un Nuevo Chat",
    cardDescription: "Elige a alguien de tu lista de amigos para empezar a chatear.",
    noFriendsTitle: "Todavía no has añadido a ningún amigo.",
    manageFriendsButton: "Gestionar Amigos",
  },
  pt: {
    pageTitle: "Nova Mensagem",
    pageDescription: "Selecione um usuário para iniciar uma conversa.",
    backButton: "Voltar para Mensagens",
    cardTitle: "Iniciar uma Nova Conversa",
    cardDescription: "Escolha alguém da sua lista de amigos para começar a conversar.",
    noFriendsTitle: "Você ainda não adicionou nenhum amigo.",
    manageFriendsButton: "Gerenciar Amigos",
  },
  fr: {
    pageTitle: "Nouveau Message",
    pageDescription: "Sélectionnez un utilisateur pour commencer une conversation.",
    backButton: "Retour aux Messages",
    cardTitle: "Commencer une Nouvelle Discussion",
    cardDescription: "Choisissez quelqu'un dans votre liste d'amis pour commencer à discuter.",
    noFriendsTitle: "Vous n'avez pas encore ajouté d'amis.",
    manageFriendsButton: "Gérer les Amis",
  },
  de: {
    pageTitle: "Neue Nachricht",
    pageDescription: "Wählen Sie einen Benutzer aus, um eine Unterhaltung zu beginnen.",
    backButton: "Zurück zu den Nachrichten",
    cardTitle: "Einen neuen Chat starten",
    cardDescription: "Wählen Sie jemanden aus Ihrer Freundesliste aus, um mit dem Chatten zu beginnen.",
    noFriendsTitle: "Sie haben noch keine Freunde hinzugefügt.",
    manageFriendsButton: "Freunde verwalten",
  },
  it: {
    pageTitle: "Nuovo Messaggio",
    pageDescription: "Seleziona un utente per iniziare una conversazione.",
    backButton: "Torna ai Messaggi",
    cardTitle: "Inizia una Nuova Chat",
    cardDescription: "Scegli qualcuno dalla tua lista di amici per iniziare a messaggiare.",
    noFriendsTitle: "Non hai ancora aggiunto nessun amico.",
    manageFriendsButton: "Gestisci Amici",
  },
  ru: {
    pageTitle: "Новое сообщение",
    pageDescription: "Выберите пользователя, чтобы начать разговор.",
    backButton: "Назад к сообщениям",
    cardTitle: "Начать новый чат",
    cardDescription: "Выберите кого-нибудь из списка друзей, чтобы начать общение.",
    noFriendsTitle: "Вы еще не добавили друзей.",
    manageFriendsButton: "Управление друзьями",
  }
};


export default function NewMessagePage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [friendsList, setFriendsList] = useState<ContactableUser[]>([]);
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  const t = translations[lang] || translations['en'];

  const loadFriends = useCallback(async () => {
    if (!currentUser) {
      router.push("/login"); 
      return;
    }
    setIsLoading(true);
    try {
      const userFriends = await S_getUserFriends(currentUser.uid);
      setFriendsList(userFriends);
    } catch (error) {
      console.error("Error loading friends list via server action:", error);
      setFriendsList([]); 
    }
    setIsLoading(false);
  }, [currentUser, router]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    loadFriends();
  }, [authLoading, loadFriends]);

  const handleSelectUser = async (selectedContact: ContactableUser) => {
    if (currentUser) {
      try {
        const result = await S_startConversation(
          currentUser.uid,
          selectedContact.id,
          selectedContact.name,
          selectedContact.avatar
        );

        if (result.success && result.conversation) {
          if (result.isNew) {
            dispatchStorageUpdatedEvent(); 
          }
          router.push(`/messages/${result.conversation.id}`);
        } else {
          console.error("Failed to start or get conversation from server action:", result.message);
        }
      } catch (error) {
        console.error("Error calling S_startConversation:", error);
      }
    }
  };
  
  const pageActions = (
     <Button variant="outline" size="sm" asChild>
        <Link href="/messages">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t.backButton}
        </Link>
    </Button>
  );

  if (isLoading || authLoading) {
    return (
      <PageShell title={t.pageTitle} description={"Loading contacts..."} actions={pageActions}>
        <Card className="shadow-lg">
            <CardHeader><CardTitle>Loading Contacts...</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.pageTitle} description={t.pageDescription} actions={pageActions}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t.cardTitle}</CardTitle>
          <CardDescription>{t.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {friendsList.length === 0 ? (
            <div className="text-center py-6">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">{t.noFriendsTitle}</p>
                <Button variant="outline" asChild>
                    <Link href="/profile">
                        <UserPlus className="mr-2 h-4 w-4" /> {t.manageFriendsButton}
                    </Link>
                </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-3">
                {friendsList.map(user => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => handleSelectUser(user)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{user.name}</p>
                        {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
