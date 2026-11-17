const LINKS = [
  ["Terms of Service", "https://telegra.ph/Terms-of-Use-10-20-2"],
  ["Privacy Policy", "https://telegra.ph/Privacy-Policy-10-31-7"],
  ["Contact Us", "mailto:hi@walnut.tv"],
] as const;

const Footer = () => {
  return (
    <div className="flex flex-wrap gap-x-2.5">
      {LINKS.map(([label, href]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8e8c8c] hover:text-negative"
        >
          {label}
        </a>
      ))}
    </div>
  );
};

export default Footer;
