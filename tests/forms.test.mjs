import test from 'node:test';
import assert from 'node:assert/strict';
import { formConfig } from '../src/config/forms.mjs';
import { validateSubmission } from '../scripts/review-server.mjs';
const contact = (changes = {}) => new URLSearchParams({name:'Demo reader',email:'demo@example.com',category:'general',message:'A fictional resource question.',...changes});
test('unconfigured production never creates a collection action',()=>assert.deepEqual(formConfig(),{review:false,contact:null,newsletter:null}));
test('only explicit local review can use loopback forms',()=>{
  assert.equal(formConfig({SITE_REVIEW_MODE:'true'}).contact,'http://127.0.0.1:4322/submit/contact');
  assert.throws(()=>formConfig({SITE_REVIEW_MODE:'true',CI:'true'}));
  assert.throws(()=>formConfig({SITE_REVIEW_MODE:'true',GITHUB_ACTIONS:'true'}));
});
test('unsafe or accidentally unapproved production endpoints fail the build',()=>{
  for(const url of ['http://forms.example.com/post','https://user:secret@forms.example.com/post','https://127.0.0.1/post','https://localhost/post','https://forms.local/post','https://forms.example.com/post?api_key=secret','javascript:alert(1)','https://[::1]/post']) assert.throws(()=>formConfig({CONTACT_FORM_URL:url,CONTACT_FORM_APPROVED:'true'}),url);
  assert.throws(()=>formConfig({CONTACT_FORM_URL:'https://forms.example.com/post'}));
  assert.equal(formConfig({CONTACT_FORM_URL:'https://forms.example.com/post',CONTACT_FORM_APPROVED:'true'}).contact,'https://forms.example.com/post');
});
test('contact demo accepts all intended categories without subscription fields',()=>{
  for(const category of ['general','guest','sponsor','mission']) assert.equal(validateSubmission('contact',contact({category})),null);
  assert.match(validateSubmission('contact',contact({consent:'yes'})),/Unexpected/);
});
test('demo rejects real email domains, invalid values, spam and overlong content',()=>{
  for(const changes of [{email:'person@real-domain.org'},{email:'bad'},{category:''},{name:''},{message:'short'},{message:'x'.repeat(3001)},{website_check:'bot'},{url:'javascript:alert(1)'}]) assert.ok(validateSubmission('contact',contact(changes)));
  const duplicate = contact(); duplicate.append('email','other@example.com'); assert.match(validateSubmission('contact',duplicate),/duplicate/);
});
test('newsletter requires independent consent and a demo failure can be retried',()=>{
  assert.ok(validateSubmission('newsletter',new URLSearchParams({email:'demo@example.com'})));
  assert.equal(validateSubmission('newsletter',new URLSearchParams({email:'demo@example.com',consent:'yes'})),null);
  assert.match(validateSubmission('newsletter',new URLSearchParams({email:'fail@example.com',consent:'yes'})),/Simulated provider failure/);
  assert.equal(validateSubmission('contact',contact()),null);
});
