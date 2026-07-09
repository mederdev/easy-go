<script setup lang="ts">
import { useDocsModel } from './model';

const { sections, scrollTo } = useDocsModel();
</script>

<template>
  <div class="wrap">
    <!-- Table of contents -->
    <div class="toc">
      <div class="toc-title">Разделы</div>
      <div class="toc-grid">
        <button
          v-for="s in sections"
          :key="s.id"
          class="toc-row"
          type="button"
          @click="scrollTo(s.id)"
        >
          <span class="ic"><span class="material-symbols-outlined">{{ s.icon }}</span></span>
          <span class="toc-label">{{ s.title }}</span>
        </button>
      </div>
    </div>

    <!-- Sections -->
    <section v-for="s in sections" :id="s.id" :key="s.id" class="card">
      <div class="card-head">
        <span class="ic"><span class="material-symbols-outlined">{{ s.icon }}</span></span>
        <h2 class="card-title">{{ s.title }}</h2>
      </div>
      <p v-if="s.intro" class="intro">{{ s.intro }}</p>
      <ol v-if="s.steps" class="steps">
        <li v-for="(step, i) in s.steps" :key="i">{{ step }}</li>
      </ol>
      <div v-if="s.note" class="note">
        <span class="material-symbols-outlined note-ic">info</span>
        <span>{{ s.note }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Table of contents */
.toc {
  background: var(--eg-surface);
  border: 1px solid var(--eg-line);
  border-radius: var(--eg-radius-md);
  padding: 16px 18px;
}
.toc-title {
  font: 700 11px var(--eg-font);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eg-hint);
  margin-bottom: 12px;
}
.toc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.toc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 10px;
  padding: 8px 8px;
  cursor: pointer;
}
.toc-row:hover { background: var(--eg-brand-light); }
.toc-label { font: 600 13.5px var(--eg-font); color: var(--eg-ink); }

/* Section cards */
.card {
  background: var(--eg-surface);
  border: 1px solid var(--eg-line);
  border-radius: var(--eg-radius-md);
  padding: 20px 22px;
  scroll-margin-top: 16px;
}
.card-head { display: flex; align-items: center; gap: 12px; }
.card-title { margin: 0; font: 800 17px var(--eg-font); color: var(--eg-ink); }
.intro { margin: 12px 0 0; font: 500 14px/1.65 var(--eg-font); color: #3a3f45; }
.steps {
  margin: 12px 0 0;
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font: 500 14px/1.55 var(--eg-font);
  color: #3a3f45;
}
.steps li::marker { color: var(--eg-brand); font-weight: 800; }
.note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  background: var(--eg-brand-light);
  border-radius: 11px;
  padding: 11px 14px;
  font: 600 13px/1.5 var(--eg-font);
  color: var(--eg-brand-dark);
}
.note-ic { font-size: 18px; flex-shrink: 0; }

/* Green icon chip */
.ic {
  width: 40px; height: 40px; border-radius: 11px; background: var(--eg-brand-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ic .material-symbols-outlined { color: var(--eg-brand); font-size: 21px; }

@media (max-width: 600px) {
  .toc-grid { grid-template-columns: 1fr; }
}
</style>
