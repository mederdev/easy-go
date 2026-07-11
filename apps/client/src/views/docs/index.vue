<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import BackButton from '@/components/BackButton.vue';
import { useDocsModel } from './model';

const { audience, sections, setAudience, contentRef, scrollTo } = useDocsModel();
</script>

<template>
  <IonPage>
    <IonContent ref="contentRef" :fullscreen="true">
      <div class="pg">
        <div style="padding: 8px 0 0 8px"><BackButton /></div>

        <div class="head">
          <h1 class="head-title">Помощь</h1>
          <p class="head-sub">Как пользоваться приложением EasyGo</p>
        </div>

        <!-- Audience switch: passenger vs driver flow -->
        <div class="seg">
          <button
            :class="['seg-btn', audience === 'passenger' && 'seg-btn--active']"
            @click="setAudience('passenger')"
          >Пассажирам</button>
          <button
            :class="['seg-btn', audience === 'driver' && 'seg-btn--active']"
            @click="setAudience('driver')"
          >Водителям</button>
        </div>

        <!-- Table of contents -->
        <div class="toc">
          <div class="toc-title">Разделы</div>
          <button
            v-for="s in sections"
            :key="s.id"
            class="toc-row"
            @click="scrollTo(s.id)"
          >
            <span class="ic"><span class="ms">{{ s.icon }}</span></span>
            <span class="toc-label">{{ s.title }}</span>
            <span class="ms toc-chev">chevron_right</span>
          </button>
        </div>

        <!-- Sections -->
        <div class="sections">
          <section v-for="s in sections" :id="s.id" :key="s.id" class="sec">
            <div class="sec-head">
              <span class="ic"><span class="ms">{{ s.icon }}</span></span>
              <h2 class="sec-title">{{ s.title }}</h2>
            </div>
            <p v-if="s.intro" class="sec-intro">{{ s.intro }}</p>
            <ol v-if="s.steps" class="sec-steps">
              <li v-for="(step, i) in s.steps" :key="i">{{ step }}</li>
            </ol>
            <div v-if="s.note" class="sec-note">
              <span class="ms note-ic">info</span>
              <span>{{ s.note }}</span>
            </div>
          </section>
        </div>

        <div style="height: 40px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .head { padding: 12px 0 0; }
  .seg, .toc, .sections { margin-left: 0; margin-right: 0; }
}

.head { padding: 6px 18px 0; }
.head-title { margin: 0; font: 800 24px 'Manrope', sans-serif; letter-spacing: -0.01em; color: var(--eg-ink); }
.head-sub { margin: 6px 0 0; font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted); }

/* Audience segmented control */
.seg {
  display: flex;
  gap: 8px;
  padding: 16px 16px 0;
}
.seg-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  cursor: pointer;
  font: 700 14px 'Manrope', sans-serif;
  border: 1px solid #e2e5df;
  background: #fff;
  color: var(--eg-muted);
  transition: all 0.15s;
}
.seg-btn--active {
  border: 2px solid var(--eg-green);
  background: var(--eg-green-light);
  color: var(--eg-green-accent);
}

/* Table of contents */
.toc {
  margin: 16px 16px 0;
  background: #fff;
  border: 1px solid #eceee9;
  border-radius: 14px;
  padding: 8px;
}
.toc-title {
  font: 700 11px 'Manrope', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--eg-muted-light);
  padding: 8px 8px 6px;
}
.toc-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 10px;
  padding: 9px 8px;
  cursor: pointer;
}
.toc-row:active { background: #f5f6f3; }
.toc-label { flex: 1; font: 600 14px 'Manrope', sans-serif; color: var(--eg-ink); }
.toc-chev { color: #c4c8c0; font-size: 18px; }

/* Sections */
.sections { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.sec {
  background: #fff;
  border: 1px solid #eceee9;
  border-radius: 14px;
  padding: 16px;
  scroll-margin-top: 12px;
}
.sec-head { display: flex; align-items: center; gap: 11px; }
.sec-title { margin: 0; font: 800 16px 'Manrope', sans-serif; color: var(--eg-ink); }
.sec-intro { margin: 12px 0 0; font: 500 14px/1.6 'Manrope', sans-serif; color: var(--eg-ink-soft); }
.sec-steps {
  margin: 10px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font: 500 14px/1.5 'Manrope', sans-serif;
  color: var(--eg-ink-soft);
}
.sec-steps li::marker { color: var(--eg-green); font-weight: 800; }
.sec-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  background: var(--eg-green-light);
  border-radius: 10px;
  padding: 10px 12px;
  font: 600 12.5px/1.5 'Manrope', sans-serif;
  color: var(--eg-green-accent);
}
.note-ic { font-size: 17px; flex-shrink: 0; }

/* Shared green icon chip */
.ic {
  width: 38px; height: 38px; border-radius: 11px; background: var(--eg-green-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ic .ms { color: var(--eg-green); font-size: 20px; }
</style>
