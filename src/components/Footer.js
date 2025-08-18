import React from 'react';

const Footer = () => {
  return (
    <footer>
      <div className="div-footer">
        <div className="footer-link-container">
          <a href="mailto:amusto@gmail.com">Contact Me</a>
          <a href="https://github.com/ammusto/yaz-scrape">
            <img id="git_footer" src="/media/github-mark.png" alt="GitHub" />
          </a>
          <a href="mailto:amusto@gmail.com">Report a Bug</a>
        </div>
        <div>
          © Antonio Musto {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
