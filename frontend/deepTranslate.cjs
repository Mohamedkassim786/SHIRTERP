const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = [
  ...walk('src/pages'),
  ...walk('src/components')
];

let modifiedCount = 0;

files.forEach(f => {
  let originalCode = fs.readFileSync(f, 'utf8');
  let code = originalCode;

  // Dictionary of exact string matches to replace inside React nodes
  const replacements = {
    '>Save<': '>{t(\'common.save\', \'Save\')}<',
    '>Cancel<': '>{t(\'common.cancel\', \'Cancel\')}<',
    '>Edit<': '>{t(\'common.edit\', \'Edit\')}<',
    '>Delete<': '>{t(\'common.delete\', \'Delete\')}<',
    '>Print<': '>{t(\'common.print\', \'Print\')}<',
    '>Submit<': '>{t(\'common.submit\', \'Submit\')}<',
    '>Add<': '>{t(\'common.add\', \'Add\')}<',
    '>Create<': '>{t(\'common.create\', \'Create\')}<',
    '>View<': '>{t(\'common.view\', \'View\')}<',
    '>Filter<': '>{t(\'common.filter\', \'Filter\')}<',
    '>Clear<': '>{t(\'common.clear\', \'Clear\')}<',
    '>Yes<': '>{t(\'common.yes\', \'Yes\')}<',
    '>No<': '>{t(\'common.no\', \'No\')}<',
    '>Confirm<': '>{t(\'common.confirm\', \'Confirm\')}<',
    '>Back<': '>{t(\'common.back\', \'Back\')}<',
    '>Actions<': '>{t(\'common.actions\', \'Actions\')}<',
    '>Generate<': '>{t(\'common.generate\', \'Generate\')}<',
    '>Active<': '>{t(\'common.active\', \'Active\')}<',
    '>Inactive<': '>{t(\'common.inactive\', \'Inactive\')}<',
    '>Pending<': '>{t(\'common.pending\', \'Pending\')}<',
    '>Completed<': '>{t(\'common.completed\', \'Completed\')}<',
    '>All<': '>{t(\'common.all\', \'All\')}<',
    '>New<': '>{t(\'common.new\', \'New\')}<',
    '>Profile<': '>{t(\'common.profile\', \'Profile\')}<',
    '>Status<': '>{t(\'common.status\', \'Status\')}<',
    '>Date<': '>{t(\'common.date\', \'Date\')}<',
    '>Amount<': '>{t(\'common.amount\', \'Amount\')}<',
    '>Total<': '>{t(\'common.total\', \'Total\')}<',
    '>Name<': '>{t(\'common.name\', \'Name\')}<',
    '>Phone<': '>{t(\'common.phone\', \'Phone\')}<',
    '>Email<': '>{t(\'common.email\', \'Email\')}<',
    '>Address<': '>{t(\'common.address\', \'Address\')}<',
    '>No records found<': '>{t(\'common.noRecords\', \'No records found\')}<'
  };

  // Replace >Text< with >{t('...', 'Text')}<
  for (const [key, value] of Object.entries(replacements)) {
    // Only replace outside of quotes (very basic check by just doing global replace)
    // We assume these exact strings >Save< etc are almost exclusively text nodes.
    const regex = new RegExp(key, 'g');
    code = code.replace(regex, value);
  }

  // Placeholders
  code = code.replace(/placeholder="Search([^"]*)"/g, "placeholder={t('common.search', 'Search$1')}");
  code = code.replace(/placeholder="Enter([^"]*)"/g, "placeholder={t('common.enter', 'Enter$1')}");

  // Check if we made changes
  if (code !== originalCode) {
    // If useTranslation is not imported, import it
    if (!code.includes('useTranslation')) {
      if (code.includes('lucide-react')) {
        code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1 } from 'lucide-react';\nimport { useTranslation } from 'react-i18next';");
      } else if (code.includes('react')) {
        code = code.replace(/import ([^\n]+) from 'react';/, "import $1 from 'react';\nimport { useTranslation } from 'react-i18next';");
      } else {
        code = "import { useTranslation } from 'react-i18next';\n" + code;
      }
      
      // Inject the hook at the top of the default export component
      code = code.replace(/export default function (\w+)\(([^)]*)\) \{/, "export default function $1($2) {\n  const { t } = useTranslation();");
    }

    fs.writeFileSync(f, code);
    modifiedCount++;
  }
});

console.log(`Deep translation complete! Modified ${modifiedCount} files.`);
