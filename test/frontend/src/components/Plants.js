import React from "react";
import "./Plants.css";
import rukolaImg from "./assets/images/rukola.png"; // Замените на свои пути
import bazilikImg from "./assets/images/bazilik.png";
import redisImg from "./assets/images/redis.png";

function Plants() {
  return (
    <div className="plants-container">
      <h1 className="plants-title">Наши растения</h1>
      
      <div className="plants-grid">
        {/* Руккола */}
        <div className="plant-card">
          <div className="plant-image-container">
            <img src={rukolaImg} alt="Руккола" className="plant-image" />
          </div>
          <div className="plant-content">
            <h2>Руккола</h2>
            <p>Содержит:</p>
            <ul>
              <li>Витамины: С, К, А, фолаты (В9)</li>
              <li>Минералы: кальций, магний, железо</li>
            </ul>
            <p>
              Микрозелень рукколы — это суперфуд, который превосходит зрелую зелень по содержанию витаминов и антиоксидантов. Всего горсть таких ростков в день укрепляет здоровье, защищает от болезней и делает питание более полезным..
            </p>
          </div>
        </div>

        {/* Базилик */}
        <div className="plant-card">
          <div className="plant-image-container">
            <img src={bazilikImg} alt="Базилик" className="plant-image" />
          </div>
          <div className="plant-content">
            <h2>Базилик</h2>
            <p>Содержит:</p>
            <ul>
              <li>Витамины: С, К, А, Е, группы В</li>
              <li>Минералы: кальций, магний, цинк</li>
            </ul>
            <p>
              Микрозелень базилика — это не только вкусная, но и очень полезная добавка к рациону, которая укрепляет здоровье и обогащает питание ценными веществами.
            </p>
          </div>
        </div>

        {/* Редис */}
        <div className="plant-card">
          <div className="plant-image-container">
            <img src={redisImg} alt="Редис" className="plant-image" />
          </div>
          <div className="plant-content">
            <h2>Редис</h2>
            <p>Содержит:</p>
            <ul>
              <li>Витамины: С, А, К, группы В</li>
              <li>Поддерживает иммунитет и нервную систему</li>
            </ul>
            <p>
              Микрозелень редиса – это маленькое чудо природы, которое дарит нам море здоровья, вкуса и радости!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Plants;