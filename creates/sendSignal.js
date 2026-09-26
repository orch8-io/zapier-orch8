'use strict';

const { apiUrl, parseJsonField, signalTypeWire } = require('../lib/client');

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const name = input.signal_type === 'custom' ? input.custom_signal : input.signal_type;
  if (!name) {
    throw new z.errors.Error('A custom signal name is required when Signal Type is "custom".', 'InvalidInput', 400);
  }
  const body = { signal_type: signalTypeWire(name) };
  const payload = parseJsonField(z, input.payload, 'Payload');
  if (payload !== undefined) body.payload = payload;

  const response = await z.request({
    method: 'POST',
    url: apiUrl(bundle, `/instances/${encodeURIComponent(input.instance_id)}/signals`),
    body,
  });
  return { signal_id: (response.data || {}).signal_id, instance_id: input.instance_id };
};

module.exports = {
  key: 'send_signal',
  noun: 'Signal',
  display: {
    label: 'Send Signal',
    description:
      'Sends a signal (pause, resume, cancel, update_context, or a custom signal such as `human_input:<block_id>` to resolve an approval) to a running instance.',
  },
  operation: {
    inputFields: [
      { key: 'instance_id', label: 'Instance ID', required: true },
      {
        key: 'signal_type',
        label: 'Signal Type',
        required: true,
        choices: {
          pause: 'pause',
          resume: 'resume',
          cancel: 'cancel',
          update_context: 'update_context',
          custom: 'custom (enter name below)',
        },
        altersDynamicFields: true,
      },
      (z, bundle) =>
        bundle.inputData.signal_type === 'custom'
          ? [
              {
                key: 'custom_signal',
                label: 'Custom Signal Name',
                required: true,
                helpText:
                  'e.g. `approval_granted`, or `human_input:<block_id>` with payload `{"value": "<choice>"}` to answer a human-review gate.',
              },
            ]
          : [],
      { key: 'payload', label: 'Payload (JSON)', type: 'text', required: false },
    ],
    perform,
    sample: { signal_id: '0194d2e6-8000-7000-8000-000000000001', instance_id: '0194d2e6-7f44-7e2a-9c3e-1a2b3c4d5e6f' },
    outputFields: [
      { key: 'signal_id', label: 'Signal ID' },
      { key: 'instance_id', label: 'Instance ID' },
    ],
  },
};
