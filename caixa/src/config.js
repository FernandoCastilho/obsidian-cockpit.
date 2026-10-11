// Valores públicos. O ID de cliente OAuth não é segredo (não há chave secreta no app);
// quem entra é decidido pelos usuários de teste no Google Cloud e pelo compartilhamento da planilha.
export const SHEET_ID = import.meta.env.VITE_SHEET_ID || '1jPVxzkRRyS-vrYd5sL50sL70itA3hUSyXfaJ0CxlD9o'
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '636240534492-osr5l3g98in49i3b0920lpl2b1ajbhnd.apps.googleusercontent.com'
