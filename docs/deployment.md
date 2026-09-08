# Preparazione della pubblicazione sullo stesso dominio

La configurazione di esempio è in `deploy/nginx.conf.example`. Non attiva né pubblica servizi. Occorrono un dominio proprio, un certificato HTTPS attendibile e un host configurato; non sono inclusi credenziali o certificati.

1. Installare le dipendenze dalle versioni nei lockfile e compilare con `npm run build`. Impostare `root` alla directory `www` che contiene `index.html` della build; `angular.json` imposta `outputPath.browser` alla stringa vuota.
2. Configurare Express con `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3000`, segreto JWT distinto e percorsi persistenti per database e allegati, fuori dalla directory pubblica. Configurare SMTP localmente senza inserire credenziali nel repository.
3. Solo se Nginx è sullo stesso host e Express è raggiungibile esclusivamente sul loopback, impostare `SLOTLAB_TRUST_PROXY=loopback`. Il proxy sovrascrive `X-Forwarded-For`: i limiti per indirizzo client funzionano senza fidarsi di header arbitrari. Il valore predefinito è `none`. Non estendere questa configurazione a proxy remoti senza adattarla.
4. Sostituire i segnaposto nel file Nginx, verificare con `nginx -t` sull'host di destinazione, poi attivare il servizio secondo la gestione dell'host.

`/api/` viene inoltrato conservando il percorso; gli errori JSON restano risposte Express. Le altre route ricevono i file Angular o il fallback `index.html`. Sono usate le direttive ufficiali [proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) e [try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files).

Prima della pubblicazione verificare sull'origine HTTPS: login, rinnovo dopo ricaricamento, logout, cookie Secure/HttpOnly, rifiuto delle richieste cross-site, `/api/v1/missing` JSON 404, allegati autenticati e accesso diretto a una route Angular. Il cookie conserva Path `/api/v1/auth`; non serve CORS aperto. L'esempio lascia passare allegati entro il limite del prodotto, che resta validato dal backend.

L'avvio applica le migrazioni al database configurato: prima di un aggiornamento operativo predisporre un backup e verificare la migrazione su una copia isolata. Il consolidamento statistico comincia dal primo avvio della nuova versione; non ricostruisce il passato mancante. Modifiche SQL manuali a capienza, fasce o indisponibilità durante il periodo monitorato invaliderebbero l'assunzione di continuità: usare le API amministrative.

La configurazione va collaudata sul server di destinazione. Le prove locali dell'app non attestano TLS, DNS, SMTP o Nginx di produzione.
