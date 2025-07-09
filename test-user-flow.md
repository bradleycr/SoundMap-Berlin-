# SoundMap User Flow Test

## 🎯 Complete User Journey Test

### **Scenario**: New user discovers SoundMap, explores Berlin, records first clip, creates account

---

## 1. 🏠 **Homepage Discovery** 
**User arrives at SoundMap for the first time**

✅ **Expected Experience:**
- Beautiful retro-styled homepage loads quickly
- Clear "SoundMap Berlin" branding visible
- Main CTA: "START WALK" button prominent
- Secondary options: RECORD, MAP, PROFILE buttons
- PWA install prompt may appear
- Loading should be < 2 seconds

**Test URLs:**
- http://localhost:3000

---

## 2. 🚶 **Walk Mode - Area Exploration**
**User clicks "START WALK" to discover local audio**

✅ **Expected Experience:**
- Quick location permission request
- Fallback to Berlin center if location denied
- Map shows with audio clip markers
- "LOCATING..." loading state brief (< 3 seconds)
- Shows nearby clips ranked by likes + recency
- Audio player with play/pause controls
- Like/dislike/skip controls
- Works offline with cached clips

**Test Flow:**
1. Click "START WALK" from homepage
2. Allow/deny location access
3. Verify map loads with clips
4. Test audio playback
5. Test like/dislike/skip controls

---

## 3. 🗺️ **Map Exploration**
**User clicks "MAP" to browse clips visually**

✅ **Expected Experience:**
- Interactive Berlin map loads
- Audio clip markers at various locations
- Click markers to see clip details
- Current location indicator
- Distance calculations shown
- Clips list below map
- Quick navigation back to other modes

**Test Flow:**
1. Navigate to map from homepage or walk mode
2. Verify all clips visible as markers
3. Click different markers
4. Test clip selection and details

---

## 4. 🎙️ **Recording Flow - Anonymous**
**User wants to record their first clip**

✅ **Expected Experience:**
- Microphone permission request
- Clear recording interface with large mic button
- Visual waveform during recording
- 60-second max timer
- Preview playback after recording
- Title input and radius slider
- **Auth prompt** when trying to upload
- Clear messaging about needing account

**Test Flow:**
1. Click "RECORD" button
2. Allow microphone access
3. Record 10-second test clip
4. Add title "Test Recording"
5. Attempt to upload
6. Verify auth prompt appears

---

## 5. 📧 **Magic Link Account Creation**
**User creates account to save their recording**

✅ **Expected Experience:**
- Clear email input field
- "SEND MAGIC LINK" button
- Success message about checking email
- Email contains working verification link
- Callback page processes verification
- Automatic redirect to app
- Profile created with email

**Test Flow:**
1. From recording auth prompt, click "SIGN IN"
2. Enter test email address
3. Click "SEND MAGIC LINK"
4. Verify success message
5. Check email for magic link
6. Click magic link
7. Verify successful sign-in

---

## 6. 💾 **First Clip Upload**
**User uploads their first recording**

✅ **Expected Experience:**
- Return to recording preview
- Upload button now enabled
- Progress indicator during upload
- Success message with celebration
- Options to "VIEW MAP" or "VIEW MY CLIPS"
- Clip appears in user's profile
- Clip visible on map with ownership

**Test Flow:**
1. Return to recording after sign-in
2. Click "SAVE CLIP"
3. Verify upload progress
4. Confirm success message
5. Test "VIEW MAP" and "VIEW MY CLIPS" buttons

---

## 7. 👤 **Profile Management**
**User checks their profile and clips**

✅ **Expected Experience:**
- Profile shows user email and name
- Three tabs: RECORDED, LIKED, ARCHIVED
- New clip appears in RECORDED tab
- Clip shows title, location, timestamp
- Play button works
- Delete button available for own clips
- Stats show 1 recorded clip

**Test Flow:**
1. Navigate to profile
2. Verify user information displayed
3. Check RECORDED tab has new clip
4. Test clip playback in profile
5. Verify clip metadata

---

## 8. 🎵 **Clip Discovery on Map**
**User sees their clip on the public map**

✅ **Expected Experience:**
- Navigate to map view
- Find new clip marker at recording location
- Click marker shows clip details
- Clip plays from map interface
- Like count starts at 0
- Proper ownership attribution

**Test Flow:**
1. Go to map view
2. Locate new clip marker
3. Click and verify details
4. Test playback from map
5. Verify ownership indicators

---

## 9. 🔄 **Cross-Platform Flow**
**Test complete flow works across all entry points**

✅ **Expected Experience:**
- Walk mode shows new clip when in range
- Map view displays clip correctly
- Profile manages clip properly
- All playback contexts work
- Offline functionality preserved

**Test Flow:**
1. Test clip in walk mode
2. Verify map display
3. Check profile management
4. Test offline/online transitions

---

## 🎯 **Success Criteria**

- [ ] Homepage loads < 2 seconds
- [ ] Walk mode initializes < 3 seconds
- [ ] Map loads with all clips visible
- [ ] Recording flow completes smoothly
- [ ] Magic link auth works end-to-end
- [ ] Clip upload succeeds
- [ ] Profile displays correctly
- [ ] Clip appears on map
- [ ] All playback contexts work
- [ ] No hanging loading states
- [ ] Offline functionality works

---

## 🐛 **Common Issues to Watch For**

- Auth timeouts causing hanging
- Infinite loading on profile/walk
- Database connection failures
- Microphone permission issues
- Location permission problems
- Magic link email delivery
- Upload failures
- Missing clip ownership
- Broken playback
- Performance degradation 