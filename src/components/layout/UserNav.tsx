
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import React, { useState, useEffect } from 'react';

const USER_AVATAR_STORAGE_KEY_PREFIX = "userAvatar_";

const translations = {
  en: {
    profile: "Profile",
    settings: "Settings",
    logOut: "Log out",
    noEmail: "No email provided",
    loading: "...",
    login: "Login"
  },
  es: {
    profile: "Perfil",
    settings: "Ajustes",
    logOut: "Cerrar sesión",
    noEmail: "No se proporcionó correo electrónico",
    loading: "...",
    login: "Iniciar Sesión"
  },
  pt: {
    profile: "Perfil",
    settings: "Configurações",
    logOut: "Sair",
    noEmail: "Nenhum e-mail fornecido",
    loading: "...",
    login: "Entrar"
  },
  fr: {
    profile: "Profil",
    settings: "Paramètres",
    logOut: "Déconnexion",
    noEmail: "Aucun email fourni",
    loading: "...",
    login: "Connexion"
  },
  de: {
    profile: "Profil",
    settings: "Einstellungen",
    logOut: "Abmelden",
    noEmail: "Keine E-Mail angegeben",
    loading: "...",
    login: "Anmelden"
  },
  it: {
    profile: "Profilo",
    settings: "Impostazioni",
    logOut: "Esci",
    noEmail: "Nessuna email fornita",
    loading: "...",
    login: "Accesso"
  },
  ru: {
    profile: "Профиль",
    settings: "Настройки",
    logOut: "Выйти",
    noEmail: "Электронная почта не указана",
    loading: "...",
    login: "Войти"
  },
};


export function UserNav() {
  const { currentUser, logout, loading } = useAuth();
  const router = useRouter();
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null | undefined>(null);
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

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

  const t = translations[lang];

  useEffect(() => {
    if (currentUser) {
      const storedAvatar = localStorage.getItem(`${USER_AVATAR_STORAGE_KEY_PREFIX}${currentUser.uid}`);
      setDisplayAvatarUrl(storedAvatar || currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.email || currentUser.displayName || currentUser.uid}.png`);
    } else {
      setDisplayAvatarUrl(null);
    }

    const handleStorageUpdate = () => {
      if (currentUser) {
        const updatedStoredAvatar = localStorage.getItem(`${USER_AVATAR_STORAGE_KEY_PREFIX}${currentUser.uid}`);
        setDisplayAvatarUrl(updatedStoredAvatar || currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.email || currentUser.displayName || currentUser.uid}.png`);
      }
    };

    window.addEventListener('storageUpdated', handleStorageUpdate);
    return () => {
      window.removeEventListener('storageUpdated', handleStorageUpdate);
    };
  }, [currentUser]);


  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{t.loading}</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  if (!currentUser) {
    return (
       <Button asChild variant="outline">
         <Link href="/login">{t.login}</Link>
       </Button>
    );
  }

  const userDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || "User";
  const userEmail = currentUser.email || t.noEmail;
  const userAvatarFallback = userDisplayName.charAt(0).toUpperCase();
  const avatarSrc = displayAvatarUrl || `https://avatar.vercel.sh/${currentUser.email || userDisplayName}.png`;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarSrc} alt={userDisplayName} />
            <AvatarFallback>{userAvatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userDisplayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/profile/${currentUser.uid}`}>
              <User className="mr-2 h-4 w-4" />
              <span>{t.profile}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href={`/profile/${currentUser.uid}`}> {/* Assuming settings is part of profile or a sub-route */}
                <Settings className="mr-2 h-4 w-4" />
                <span>{t.settings}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t.logOut}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    