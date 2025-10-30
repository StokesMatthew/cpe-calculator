# CPE Calculator

A web application for calculating Continuing Professional Education (CPE) credits and determining certificate eligibility.

## Features

- 📊 **Multiple CSV Format Support**: Process participants, poll responses, and registrants
- 🎯 **Flexible Credit Calculation**: Configurable rounding (0.2, 0.5, 1.0 increments)
- 🤖 **Smart Email Matching**: Fuzzy name matching to find missing email addresses
- ⏰ **Session Time Clamping**: User-provided start/end times with boundary enforcement
- 📈 **Interactive Results**: Sortable, filterable results table with summary statistics
- 💾 **CSV Export**: Download results for further analysis
- 🔒 **Privacy-First**: 100% client-side processing

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
```

Creates optimized production build in `build/` folder.

## Usage

1. **Set Session Times** (time only - e.g., 10:51, 12:03)
   - Start: When presentation began
   - End: When presentation ended

2. **Upload Files**
   - **Participants CSV**: Required - attendance records
   - **Poll Responses CSV**: Required - quiz/poll answers
   - **Registrants CSV**: Optional - for email lookup

3. **Click "Calculate CPE Credits"**

4. **Review Results** and export if needed



## Credit Calculation

**Formula**: `Math.floor(duration / 50 * 5) / 5`

- **50 min** = 1.0 credit (minimum)
- **62 min** = 1.2 credits
- **100 min** = 2.0 credits

### Eligibility Requirements

1. **Duration**: ≥ 50 minutes
2. **Questions**: Based on credits earned
   - 3 questions per full credit
   - +0 for decimal < 0.25
   - +1 for decimal 0.25 to < 0.5
   - +2 for decimal 0.5 to < 0.75
   - +3 for decimal 0.75 to < 1.0

**Example**: 1.6 credits requires 5 questions (3 base + 2 for 0.6 decimal)

## Project Structure

```
cpe-calculator/
├── public/
│   ├── index.html
├── src/
│   ├── components/
│   │   ├── ConfigPanel.js    # Session time & rounding config
│   │   ├── FileUpload.js     # Drag-and-drop file upload
│   │   └── ResultsTable.js   # Sortable results display
│   ├── utils/
│   │   ├── Calculator.js     # CPE credit calculations
│   │   ├── CSVExporter.js    # Export results to CSV
│   │   ├── CSVParser.js      # Parse various CSV formats
│   │   └── NameMatcher.js    # Fuzzy name matching
│   ├── App.js               # Main application
│   ├── App.css              # Styles
│   └── index.js             # React entry point
└── package.json
```

## Technologies

- **React 18** - UI framework
- **PapaParse** - CSV parsing
- **Pure CSS** - No CSS frameworks
- **ES6+** - Modern JavaScript

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Deployment

Build the application for production and deploy the `build/` folder to any static hosting service such as:
- Netlify
- Vercel
- AWS S3
- GitHub Pages
- Any static web host

## Privacy

All data processing occurs in your browser. No information is transmitted to external servers. Files are processed in memory only.

## License

See LICENSE file for details.

