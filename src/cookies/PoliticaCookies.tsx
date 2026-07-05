import { UseLanguage } from "../contexts/LanguageContext";
import { UseTheme } from "../contexts/ThemeContext";
import "./politicaCookie.css"

const PoliticaCookies = () => {
    const { theme } = UseTheme()
    const { texts, language } = UseLanguage()
    return (
        <section className={`cookies-page-wrapper ${theme}`}>
            <div className="cookies-container">

                <h1 className="cookies-title">{texts[language].cookies.title}</h1>

                <p className="cookies-text">
                    {texts[language].cookies.intro}
                </p>

                <div className="cookies-content-body">
                    <h3>{texts[language].cookies.questionWhat}</h3>
                    <p className="cookies-text">
                        {texts[language].cookies.answerWhat}
                    </p>

                    <h3>{texts[language].cookies.questionTypes}</h3>
                    <ul className="cookies-list">
                        <li>{texts[language].cookies.typeEssential}</li>
                        <li>{texts[language].cookies.typeEssential}</li>
                        <li>{texts[language].cookies.typePerformance}</li>
                        <li>{texts[language].cookies.typeFunctionality}</li>
                    </ul>

                    <h3><li>{texts[language].cookies.questionManage}</li></h3>
                    <p className="cookies-text">
                        <li>{texts[language].cookies.answerManage}</li>
                    </p>
                </div>
            </div>
        </section>
    )
}

export default PoliticaCookies;