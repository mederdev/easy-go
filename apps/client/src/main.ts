import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router/index.js';

/* Ionic core CSS */
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* EasyGo design tokens (sets --ion-color-primary + custom vars) */
import '@easygo/ui-tokens/tokens.css';

/* App-level styles */
import './styles/global.css';

const app = createApp(App);
app.use(createPinia());
app.use(IonicVue, { mode: 'ios' });
app.use(router);

router.isReady().then(() => {
  app.mount('#app');
});
