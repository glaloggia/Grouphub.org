
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, type FormEvent, useEffect } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { S_updateUserInAllUsersList } from '@/actions/user-profile-actions';
import { S_joinDefaultChatroom } from '@/actions/group-actions';
import { S_sendWelcomeMessage } from '@/actions/message-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { Checkbox } from "@/components/ui/checkbox";

const getDefaultVercelAvatar = (identifier: string | null | undefined): string => {
    if (!identifier) return `https://avatar.vercel.sh/User.png?text=U`;
    const namePart = identifier.includes('@') ? identifier.split('@')[0] : identifier;
    const firstChar = (namePart.charAt(0) || 'U').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(namePart)}.png?text=${firstChar}`;
};

const translations = {
  en: {
    signUpTitle: "Sign Up",
    signUpDescription: "Create your GroupHub account.",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Your Name",
    emailLabel: "Email",
    passwordLabel: "Password",
    errorAllFields: "Please fill in all fields.",
    errorPasswordLength: "Password must be at least 6 characters long.",
    successMessage: "Account created successfully! Redirecting to login...",
    errorUnexpected: "An unexpected error occurred during signup.",
    signingUp: "Signing up...",
    signUpButton: "Sign Up",
    haveAccount: "Already have an account?",
    loginLink: "Login",
    ageConfirmation: "I confirm I am over 18 years old.",
    errorAgeConfirmation: "You must confirm you are over 18 to create an account.",
  },
  es: {
    signUpTitle: "Regístrate",
    signUpDescription: "Crea tu cuenta de GroupHub.",
    fullNameLabel: "Nombre Completo",
    fullNamePlaceholder: "Tu Nombre",
    emailLabel: "Correo Electrónico",
    passwordLabel: "Contraseña",
    errorAllFields: "Por favor, rellena todos los campos.",
    errorPasswordLength: "La contraseña debe tener al menos 6 caracteres.",
    successMessage: "¡Cuenta creada con éxito! Redirigiendo al inicio de sesión...",
    errorUnexpected: "Ocurrió un error inesperado durante el registro.",
    signingUp: "Registrando...",
    signUpButton: "Regístrate",
    haveAccount: "¿Ya tienes una cuenta?",
    loginLink: "Iniciar Sesión",
    ageConfirmation: "Confirmo que soy mayor de 18 años.",
    errorAgeConfirmation: "Debes confirmar que eres mayor de 18 años para crear una cuenta.",
  },
  pt: {
    signUpTitle: "Cadastre-se",
    signUpDescription: "Crie sua conta no GroupHub.",
    fullNameLabel: "Nome Completo",
    fullNamePlaceholder: "Seu Nome",
    emailLabel: "E-mail",
    passwordLabel: "Senha",
    errorAllFields: "Por favor, preencha todos os campos.",
    errorPasswordLength: "A senha deve ter pelo menos 6 caracteres.",
    successMessage: "Conta criada com sucesso! Redirecionando para o login...",
    errorUnexpected: "Ocorreu um erro inesperado durante o cadastro.",
    signingUp: "Cadastrando...",
    signUpButton: "Cadastrar",
    haveAccount: "Já tem uma conta?",
    loginLink: "Entrar",
    ageConfirmation: "Confirmo que tenho mais de 18 anos.",
    errorAgeConfirmation: "Você deve confirmar que tem mais de 18 anos para criar uma conta.",
  },
  fr: {
    signUpTitle: "Inscription",
    signUpDescription: "Créez votre compte GroupHub.",
    fullNameLabel: "Nom Complet",
    fullNamePlaceholder: "Votre Nom",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    errorAllFields: "Veuillez remplir tous les champs.",
    errorPasswordLength: "Le mot de passe doit comporter au moins 6 caractères.",
    successMessage: "Compte créé avec succès ! Redirection vers la page de connexion...",
    errorUnexpected: "Une erreur inattendue s'est produite lors de l'inscription.",
    signingUp: "Inscription en cours...",
    signUpButton: "S'inscrire",
    haveAccount: "Vous avez déjà un compte ?",
    loginLink: "Connexion",
    ageConfirmation: "Je confirme avoir plus de 18 ans.",
    errorAgeConfirmation: "Vous devez confirmer que vous avez plus de 18 ans pour créer un compte.",
  },
  de: {
    signUpTitle: "Registrieren",
    signUpDescription: "Erstellen Sie Ihr GroupHub-Konto.",
    fullNameLabel: "Vollständiger Name",
    fullNamePlaceholder: "Ihr Name",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    errorAllFields: "Bitte füllen Sie alle Felder aus.",
    errorPasswordLength: "Das Passwort muss mindestens 6 Zeichen lang sein.",
    successMessage: "Konto erfolgreich erstellt! Sie werden zum Login weitergeleitet...",
    errorUnexpected: "Bei der Registrierung ist ein unerwarteter Fehler aufgetreten.",
    signingUp: "Registriere...",
    signUpButton: "Registrieren",
    haveAccount: "Haben Sie bereits ein Konto?",
    loginLink: "Anmelden",
    ageConfirmation: "Ich bestätige, dass ich über 18 Jahre alt bin.",
    errorAgeConfirmation: "Sie müssen bestätigen, dass Sie über 18 sind, um ein Konto zu erstellen.",
  },
  it: {
    signUpTitle: "Registrati",
    signUpDescription: "Crea il tuo account GroupHub.",
    fullNameLabel: "Nome Completo",
    fullNamePlaceholder: "Il Tuo Nome",
    emailLabel: "Email",
    passwordLabel: "Password",
    errorAllFields: "Si prega di compilare tutti i campi.",
    errorPasswordLength: "La password deve contenere almeno 6 caratteri.",
    successMessage: "Account creato con successo! Reindirizzamento al login...",
    errorUnexpected: "Si è verificato un errore imprevisto durante la registrazione.",
    signingUp: "Registrazione...",
    signUpButton: "Registrati",
    haveAccount: "Hai già un account?",
    loginLink: "Accedi",
    ageConfirmation: "Confermo di avere più di 18 anni.",
    errorAgeConfirmation: "Devi confermare di avere più di 18 anni per creare un account.",
  },
  ru: {
    signUpTitle: "Регистрация",
    signUpDescription: "Создайте свою учетную запись GroupHub.",
    fullNameLabel: "Полное имя",
    fullNamePlaceholder: "Ваше имя",
    emailLabel: "Электронная почта",
    passwordLabel: "Пароль",
    errorAllFields: "Пожалуйста, заполните все поля.",
    errorPasswordLength: "Пароль должен содержать не менее 6 символов.",
    successMessage: "Учетная запись успешно создана! Перенаправление на страницу входа...",
    errorUnexpected: "Произошла непредвиденная ошибка при регистрации.",
    signingUp: "Регистрация...",
    signUpButton: "Зарегистрироваться",
    haveAccount: "Уже есть аккаунт?",
    loginLink: "Войти",
    ageConfirmation: "Я подтверждаю, что мне больше 18 лет.",
    errorAgeConfirmation: "Вы должны подтвердить, что вам больше 18 лет, чтобы создать учетную запись.",
  }
};

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOver18, setIsOver18] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  const { signup, error: authError } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
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
    setFormError(null); 
    setSignupSuccess(false);

    if (!email || !password || !name) {
      setFormError(t.errorAllFields);
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setFormError(t.errorPasswordLength);
      setIsSubmitting(false);
      return;
    }
    if (!isOver18) {
      setFormError(t.errorAgeConfirmation);
      setIsSubmitting(false);
      return;
    }

    try {
      const signedUpUser = await signup(email, password, name);

      if (signedUpUser) {
        const effectiveName = signedUpUser.displayName || name; 
        const defaultAvatar = getDefaultVercelAvatar(effectiveName || signedUpUser.email || signedUpUser.uid);

        // 1. Update user profile in Firestore
        await S_updateUserInAllUsersList(
            signedUpUser.uid, 
            effectiveName, 
            defaultAvatar, 
            signedUpUser.email 
        );

        // 1.5 Join default Chatroom group
        await S_joinDefaultChatroom(signedUpUser.uid);

        // 2. Send automatic welcome DM from App Owner
        await S_sendWelcomeMessage(signedUpUser.uid);
        
        dispatchStorageUpdatedEvent();

        setSignupSuccess(true);
        setTimeout(() => router.push('/login'), 2000);

      }
    } catch (e) {
      console.error("[SignupForm] Unexpected error in handleSubmit:", e);
      setFormError(t.errorUnexpected);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = formError || authError;
  const anyLoading = isSubmitting || signupSuccess;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{t.signUpTitle}</CardTitle>
        <CardDescription>{t.signUpDescription}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.fullNameLabel}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t.fullNamePlaceholder}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={anyLoading}
            />
          </div>
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
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isOver18" checked={isOver18} onCheckedChange={(checked) => setIsOver18(checked as boolean)} disabled={anyLoading} />
            <Label htmlFor="isOver18" className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t.ageConfirmation}
            </Label>
          </div>
           {signupSuccess && (
            <p className="text-sm text-green-600">
              {t.successMessage}
            </p>
           )}
           {displayError && !signupSuccess && (
            <p className="text-sm text-destructive">
              {displayError}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" className="w-full" disabled={anyLoading}>
           {isSubmitting ? t.signingUp : <><UserPlus className="mr-2 h-4 w-4" /> {t.signUpButton}</>}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            {t.haveAccount}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t.loginLink}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
