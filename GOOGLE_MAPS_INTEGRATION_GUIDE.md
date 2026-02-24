# Google Maps Integration Guide

## Overview

The project creation workflow now includes full Google Maps integration for address lookup and GPS coordinate selection.

---

## Features Implemented

### Step 5: Address Search with Autocomplete
- **Google Places Autocomplete**: Real-time address suggestions as you type
- **Automatic Parsing**: Extracts street, suburb, city, postcode, and country
- **Geocoding**: Automatically captures GPS coordinates from selected address
- **Manual Entry Fallback**: If API key is not configured, manual entry is still available

### Step 6: Interactive Map for GPS Coordinates
- **Interactive Google Map**: Full map display with drag-and-drop marker
- **Click to Set Location**: Click anywhere on map to set coordinates
- **Drag Marker**: Drag the marker to fine-tune the exact location
- **Auto-centering**: Map centers on address from Step 5
- **Manual Coordinate Entry**: Still allows manual lat/long input
- **Real-time Updates**: Map updates when coordinates are manually entered

---

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API** (optional but recommended)

4. Create credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

5. Secure your API key (recommended):
   - Click on the API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose the APIs you enabled above
   - Under "Website restrictions", add your domain(s)

### 2. Add API Key to Environment Variables

Open your `.env` file and update the Google Maps API key:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Important**: Replace `YOUR_ACTUAL_API_KEY_HERE` with your real API key.

### 3. Restart Development Server

After updating the `.env` file, restart your development server:

```bash
npm run dev
```

---

## How It Works

### Without API Key
- **Step 5**: Shows a warning banner and defaults to manual address entry
- **Step 6**: Shows placeholder message and allows manual coordinate input
- Both steps remain fully functional with manual data entry

### With API Key
- **Step 5**:
  - Address search field with Google Places autocomplete
  - Suggestions appear as you type
  - Selecting an address auto-fills all fields including coordinates
  - Can still switch to manual entry if needed

- **Step 6**:
  - Full interactive Google Map (400px height)
  - Draggable marker shows current location
  - Click map to set new location
  - Drag marker to fine-tune position
  - Coordinates update in real-time
  - Manual coordinate fields still available

---

## User Experience Flow

### Typical Workflow

1. **Step 5 - Address Entry**:
   ```
   User types: "123 Queen Street, Auckland"
   → Google suggests complete addresses
   → User selects: "123 Queen Street, Auckland CBD, Auckland 1010, New Zealand"
   → Form auto-fills:
       - Street: "123 Queen Street"
       - Suburb: "Auckland CBD"
       - City: "Auckland"
       - Postcode: "1010"
       - Country: "New Zealand"
       - Coordinates: -36.848461, 174.763336
   ```

2. **Step 6 - GPS Verification**:
   ```
   → Map loads centered on address from Step 5
   → Red marker shows exact location
   → User can:
       • Verify location is correct
       • Drag marker to adjust if needed
       • Click different spot on map
       • Or manually adjust lat/long fields
   ```

---

## Technical Details

### Address Autocomplete (Step 5)
- Uses Google Places Autocomplete API
- Filters for address types
- Parses address components:
  - `street_number` + `route` → Street Address
  - `sublocality` / `sublocality_level_1` → Suburb
  - `locality` → City
  - `postal_code` → Postcode
  - `country` → Country
  - `geometry.location` → Latitude & Longitude

### Interactive Map (Step 6)
- Uses Google Maps JavaScript API
- Map configuration:
  - Default zoom: 15
  - Controls: Map type, Street view, Fullscreen
  - Initial center: Coordinates from Step 5 or Auckland default
- Marker features:
  - Draggable
  - Updates coordinates on drag end
  - Repositions on map click
  - Syncs with manual coordinate inputs

### Error Handling
- Graceful degradation if API key is missing
- Warning banners explain what's needed
- Manual entry always available as fallback
- Script loading errors caught and handled
- Duplicate script loading prevented

---

## API Cost Considerations

### Google Maps Pricing (as of 2024)
- **Places Autocomplete**: $2.83 per 1,000 requests (Session-based)
- **Maps JavaScript API**: $7 per 1,000 loads
- **Geocoding API**: $5 per 1,000 requests

### Free Tier
Google provides $200 free credit per month, which covers:
- ~28,000 autocomplete sessions
- ~28,500 map loads
- Or a combination

### Cost Optimization Tips
1. Set up billing alerts in Google Cloud Console
2. Restrict API key to your domain(s)
3. Monitor usage in Google Cloud Console
4. Consider caching geocoded addresses if appropriate

---

## Troubleshooting

### Map Not Loading
**Symptom**: Placeholder shows "Loading map..." indefinitely

**Solutions**:
1. Check API key is correctly set in `.env`
2. Verify Maps JavaScript API is enabled in Google Cloud Console
3. Check browser console for API errors
4. Ensure API key has no domain restrictions (for development)

### Autocomplete Not Working
**Symptom**: No suggestions appear when typing

**Solutions**:
1. Check Places API is enabled in Google Cloud Console
2. Verify API key is correct
3. Check browser console for errors
4. Try switching to manual entry and back

### Coordinates Not Updating
**Symptom**: Map shows but coordinates don't change

**Solutions**:
1. Try typing coordinates manually first
2. Refresh the page and try again
3. Check browser console for JavaScript errors

---

## Development vs Production

### Development
- Can use unrestricted API key for testing
- All domains allowed
- Full error messages in console

### Production
- **Must** restrict API key by:
  - Domain (e.g., yourdomain.com)
  - Specific APIs
- Consider rate limiting
- Monitor usage and costs
- Set up billing alerts

---

## Files Modified

1. **`.env`** - Added `VITE_GOOGLE_MAPS_API_KEY`
2. **`src/components/wizard/WizardStep5.tsx`** - Address autocomplete
3. **`src/components/wizard/WizardStep6.tsx`** - Interactive map

---

## Future Enhancements

Potential improvements:
- [ ] what3words API integration
- [ ] Reverse geocoding (click map to get address)
- [ ] Drawing polygon for project area
- [ ] Save favorite locations
- [ ] Recent addresses dropdown
- [ ] Street view integration
- [ ] Satellite view toggle

---

## Support

If you encounter issues:
1. Check this guide first
2. Verify API key configuration
3. Check Google Cloud Console for API status
4. Review browser console for errors
5. Test with manual entry as fallback

---

## Important Notes

- Google Maps requires a valid API key to function
- Without an API key, the system gracefully falls back to manual entry
- API usage is billed by Google - monitor your usage
- Keep your API key secure and never commit it to version control
- The `.env` file is gitignored by default for security
