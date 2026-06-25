import { ref } from 'vue';
import type { CreatePartnerApplicationInput } from '@easygo/shared';
import { api } from '@/lib/api';
import { useFormModel } from '@/composables/useFormModel';

/** Partner lead form: validated fields submitted to the applications endpoint. */
export function usePartnersModel() {
  const company = ref('');
  const sphere = ref('');
  const contacts = ref('');
  const proposal = ref('');

  const companyError = ref('');
  const contactsError = ref('');

  const { submitting, submitError, sent, submit: runSubmit } = useFormModel();

  function validate(): boolean {
    companyError.value = '';
    contactsError.value = '';
    let ok = true;
    if (!company.value.trim()) {
      companyError.value = 'Введите название компании';
      ok = false;
    }
    if (!contacts.value.trim()) {
      contactsError.value = 'Введите контактные данные';
      ok = false;
    }
    return ok;
  }

  async function submit() {
    if (!validate()) return;
    await runSubmit(async () => {
      const input: CreatePartnerApplicationInput = {
        company: company.value.trim(),
        sphere: sphere.value.trim() || undefined,
        contacts: contacts.value.trim(),
        proposal: proposal.value.trim() || undefined,
      };
      await api.applications.submitPartner(input);
    });
  }

  return {
    company,
    sphere,
    contacts,
    proposal,
    companyError,
    contactsError,
    submitting,
    submitError,
    sent,
    submit,
  };
}
