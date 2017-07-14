% ************************************************************
%
%           GENERALISERA.M
%
%    Detta program är skrivet för att förenkla linjeobjekt
%    av ICOS sjömätningar.
%
% -----------------------------------------------------------------
%
%   Lars Harrie 20170705
%
% -----------------------------------------------------------------
%		Viktiga parametrar
% -----------------------------------------------------------------
% 
%    ny_linje_   	resultatet efter förenkling 
%
% -----------------------------------------------------------------
%
%		Hjälpfunktioner och program
%
%    triangleArea		räknar ut area på en triangel
%
% ************************************************************
%
clear, clf
format long;
axis('equal'), hold on;
axis('off'), hold on;
% 
% ------------------------------------------------------------
%  
%  Sätt Globala Parametrar
% 
% Maximalt antal punkter
maxNumPoints = 30;
%
%
% ************************************************************
%
%         Inläsning av data och plottning av orginaldata
%         Undersökning om linjen är sluten eller öppen
%
% ************************************************************
%
% Läs in data
%
% Enkla linjer
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData.txt'
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData2.txt'
%OrgData=OrgData2;
%
% Lite komplicerade linjer
%
load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData3.txt'
OrgData=OrgData3;
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData4.txt'
%OrgData=OrgData4;
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData5.txt'
%OrgData=OrgData5;
%
%
% Komplicerade linjer
%
%load 'D:\My Documents\Egna_projekt\ICOS carbon portal\Geometrisk sökning 2016\Matlab test 2017\Data\OrgData6.txt'
%OrgData=OrgData6;
%
[rader kolumner]=size(OrgData);
for i=1:(rader-1)	
	Graphx=[OrgData(i,1), OrgData(i+1,1)];
	Graphy=[OrgData(i,2), OrgData(i+1,2)];
	plot(Graphx,Graphy,'r'),hold on
end;
%
%
disp = [ 'Ursprungligt antal punkter: ', num2str(rader) ]
%
% **************************************************************************
%
% ****  Förenkla funktionen med en strömmande algoritm *****
%
tic; % Starta tidmätning
%
% Skapa en tredje kolumn som anger prioriteten på linjen
%
linje= [ OrgData, Inf(rader,1), ones(rader,1) ];
%
% Beräkna prioriet för de första maxNumPoints punkterna.
% Prioritet sätts lika med area för triangeln skapa med 
% föregående och efterföljande punkt.
% Första punkten ska aldrig raderas
for i=2:maxNumPoints	
	linje(i,3)=triangleArea( linje(i-1,1),linje(i-1,2), linje(i,1),linje(i,2), linje(i+1,1),linje(i+1,2)); 
end;
%
% Addera nästa punkt i listan samt ta bort punkt med lägst prioritet
%
for i = (maxNumPoints+1) : (rader-1)   
%for i = (maxNumPoints+1) : (maxNumPoints+100)

    % Beräkna prioritet för punkt
    linje(i,3)=triangleArea( linje(i-1,1),linje(i-1,2), linje(i,1),linje(i,2), linje(i+1,1),linje(i+1,2));
    %
    % Ta bort punkten med lägst prioritet
    [M,j] = min(linje(:,3));
    linje(j,3)=Inf; 
    linje(j,4)=0;
    % Beräkna nya prioriteter för föregående och nästa punkt
    k=j-1 % Föregånde
    while (linje(k,4)<0.1)
        k=k-1;
    end
    if (k>1.5)
        linje(k,3)=triangleArea( linje(k-1,1),linje(k-1,2), linje(k,1),linje(k,2), linje(k+2,1),linje(k+2,2));
    end
    k=j+1; % Nästa
    while (linje(k,4)==0)
        k=k+1;
    end
    if (k < (rader-0.5) )
        linje(k,3)=triangleArea( linje(k-2,1),linje(k-2,2), linje(k,1),linje(k,2), linje(k+1,1),linje(k+1,2));
    end
    %
end
%
%
toc % Sluta tidmätning
%
% *****************************************************************
%
linje
size(linje)
%
% Plocka ut de punkter som ska bevaras och
% lagra dem i vektorn ny_linje
% 
ny_linje=zeros(maxNumPoints,2);
j=0;
for i=1:rader
    if (linje(i,4) > 0.5)
        j=j+1;
        ny_linje(j,1:2)=linje(i,1:2);
    end
end
%
%
toc
%
%  Rita ut den av D&P förenklade linjen
%
for i=1:(maxNumPoints-1)	
	Graphx=[ny_linje(i,1), ny_linje(i+1,1)];
	Graphy=[ny_linje(i,2), ny_linje(i+1,2)];
	plot(Graphx,Graphy,'k'),hold on
end;
%
%
%  ************** END ****************************************
%