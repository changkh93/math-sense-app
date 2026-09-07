import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'esbuild';
const source = fs.readFileSync('src/components/Space/CrewDetailView.jsx', 'utf8');
const modalSource = source.slice(source.indexOf('function CrewRosterModal('), source.indexOf('export default function CrewDetailView('));
const { code } = await transform(modalSource + '\nglobalThis.Modal = CrewRosterModal;', { loader: 'jsx', jsx: 'transform' });
const Stub = () => null;
const context = { React, useState: React.useState, useMemo: React.useMemo, useEffect: React.useEffect,
  createPortal: (element) => element, document: { body: {} }, Motion: { section: 'section' },
  Users: Stub, X: Stub, Search: Stub, Loader2: Stub, LogOut: Stub,
  CrewRosterRow: Stub, GuestCrewPresenceCard: Stub, CrewMemberPublicCard: Stub, CrewMemberStudyCard: Stub,
  getMemberLabel: (member) => member?.name || '멤버',
};
vm.createContext(context); vm.runInContext(code, context);
function render(overrides = {}) {
  return renderToStaticMarkup(React.createElement(context.Modal, { open: true, members: [{ uid: 'target' }], profiles: {}, currentUid: 'leader', canManageMembers: true, onRemoveMember: Stub, ...overrides }));
}
assert.match(render(), /이 멤버 내보내기/);
assert.doesNotMatch(render({ canManageMembers: false }), /이 멤버 내보내기/);
assert.doesNotMatch(render({ members: [{ uid: 'leader' }] }), /이 멤버 내보내기/);
assert.doesNotMatch(render({ members: [{ uid: 'guest', isGuest: true }] }), /이 멤버 내보내기/);
assert.match(render({ removingUid: 'target' }), /disabled=""/);
assert.match(render({ removalMessage: '처리 실패' }), /role="status"[^>]*>처리 실패/);
const invocation = source.match(/<CrewRosterModal\s[\s\S]*?\/>/)?.[0] || '';
for (const prop of ['canManageMembers=', 'onRemoveMember={handleRemoveMember}', 'removingUid={removingUid}', 'removalMessage={removalMessage}']) assert.ok(invocation.includes(prop), `Missing roster prop: ${prop}`);
console.log('Crew removal UI: leader/member/self/guest visibility, busy state, feedback and wiring passed.');
