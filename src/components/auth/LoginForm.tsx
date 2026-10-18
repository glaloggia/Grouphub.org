
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, type FormEvent, useEffect } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const translations = {
  en: {
    loginTitle: "Login",
    loginDescription: "Enter your credentials to access your account.",
    emailLabel: "Email",
    passwordLabel: "Password",
    errorAllFields: "Please fill in all fields.",
    errorLoginFailed: "Login failed. Please check your credentials.",
    errorUnexpected: "An unexpected error occurred during the login attempt.",
    loggingIn: "Logging in...",
    loginButton: "Login",
    noAccount: "Don't have an account?",
    signUpLink: "Sign up",
  },
  es: {
    loginTitle: "Iniciar Sesión",
    loginDescription: "Ingresa tus credenciales para acceder a tu cuenta.",
    emailLabel: "Correo Electrónico",
    passwordLabel: "Contraseña",
    errorAllFields: "Por favor, rellena todos los campos.",
    errorLoginFailed: "El inicio de sesión falló. Por favor, verifica tus credenciales.",
    errorUnexpected: "Ocurrió un error inesperado durante el intento de inicio de sesión.",
    loggingIn: "Iniciando sesión...",
    loginButton: "Iniciar Sesión",
    noAccount: "¿No tienes una cuenta?",
    signUpLink: "Regístrate",
  },
  pt: {
    loginTitle: "Entrar",
    loginDescription: "Insira suas credenciais para acessar sua conta.",
    emailLabel: "E-mail",
    passwordLabel: "Senha",
    errorAllFields: "Por favor, preencha todos os campos.",
    errorLoginFailed: "Falha no login. Por favor, verifique suas credenciais.",
    errorUnexpected: "Ocorreu um erro inesperado durante a tentativa de login.",
    loggingIn: "Entrando...",
    loginButton: "Entrar",
    noAccount: "Não tem uma conta?",
    signUpLink: "Cadastre-se",
  },
  fr: {
    loginTitle: "Connexion",
    loginDescription: "Entrez vos identifiants pour accéder à votre compte.",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    errorAllFields: "Veuillez remplir tous les champs.",
    errorLoginFailed: "La connexion a échoué. Veuillez vérifier vos identifiants.",
    errorUnexpected: "Une erreur inattendue s'est produite lors de la tentative de connexion.",
    loggingIn: "Connexion en cours...",
    loginButton: "Se connecter",
    noAccount: "Vous n'avez pas de compte?",
    signUpLink: "Inscrivez-vous",
  },
  de: {
    loginTitle: "Anmelden",
    loginDescription: "Geben Sie Ihre Anmeldeinformationen ein, um auf Ihr Konto zuzugreifen.",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    errorAllFields: "Bitte füllen Sie alle Felder aus.",
    errorLoginFailed: "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldeinformationen.",
    errorUnexpected: "Während des Anmeldeversuchs ist ein unerwarteter Fehler aufgetreten.",
    loggingIn: "Melde an...",
    loginButton: "Anmelden",
    noAccount: "Haben Sie noch kein Konto?",
    signUpLink: "Registrieren",
  },
  it: {
    loginTitle: "Accesso",
    loginDescription: "Inserisci le tue credenziali per accedere al tuo account.",
    emailLabel: "Email",
    passwordLabel: "Password",
    errorAllFields: "Si prega di compilare tutti i campi.",
    errorLoginFailed: "Accesso fallito. Si prega di controllare le credenziali.",
    errorUnexpected: "Si è verificato un errore imprevisto durante il tentativo di accesso.",
    loggingIn: "Accesso in corso...",
    loginButton: "Accesso",
    noAccount: "Non hai un account?",
    signUpLink: "Registrati",
  },
  ru: {
    loginTitle: "Вход",
    loginDescription: "Введите свои данные для доступа к учетной записи.",
    emailLabel: "Электронная почта",
    passwordLabel: "Пароль",
    errorAllFields: "Пожалуйста, заполните все поля.",
    errorLoginFailed: "Ошибка входа. Пожалуйста, проверьте свои данные.",
    errorUnexpected: "Произошла непредвиденная ошибка при попытке входа.",
    loggingIn: "Вход...",
    loginButton: "Войти",
    noAccount: "Нет учетной записи?",
    signUpLink: "Зарегистрироваться",
  }
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localFormError, setLocalFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  const { login, error: authError, loading: authLoading } = useAuth();
  const router = useRouter();

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLocalFormError(null);

    if (!email || !password) {
      setLocalFormError(t.errorAllFields);
      setIsSubmitting(false);
      return;
    }

    try {
      const user = await login(email, password);
      if (user) {
        router.push('/dashboard');
      } else {
        if (!authError) {
            setLocalFormError(t.errorLoginFailed);
        }
      }
    } catch (e) {
      console.error("Unexpected error in LoginForm handleSubmit:", e);
      setLocalFormError(t.errorUnexpected);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = authError || localFormError;
  const anyLoading = isSubmitting || authLoading;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{t.loginTitle}</CardTitle>
        <CardDescription>{t.loginDescription}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={anyLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.passwordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={anyLoading}
            />
          </div>
           {displayError && (
            <p className="text-sm text-destructive">
              {displayError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" className="w-full" disabled={anyLoading}>
            {isSubmitting ? t.loggingIn : <><LogIn className="mr-2 h-4 w-4" /> {t.loginButton}</>}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {t.noAccount}{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              {t.signUpLink}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

    